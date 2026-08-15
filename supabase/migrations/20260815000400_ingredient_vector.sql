-- 全成分表示は「配合量の多い順」。この並び順を情報として使う。
-- 位置 i (0始まり) の成分に w = 1 / log2(i + 2) を掛けた重み付き multi-hot を作り、L2 正規化する。
create or replace function build_ingredient_vec(p_ingredients text[])
returns vector(256)
language plpgsql
stable
as $$
declare
  acc double precision[] := array_fill(0::double precision, array[256]);
  i int;
  d int;
  w double precision;
  norm double precision := 0;
  parts text[] := '{}';
begin
  if p_ingredients is null then
    return null;
  end if;

  for i in 1 .. array_length(p_ingredients, 1) loop
    select dim into d
    from ingredients_master
    where lower(inci) = lower(btrim(p_ingredients[i]))
    limit 1;

    if d is not null then
      w := 1.0 / (ln(i + 1) / ln(2.0));  -- i は 1 始まりなので log2(i+1) = log2((i-1)+2)
      acc[d] := acc[d] + w;
    end if;
  end loop;

  for i in 1 .. 256 loop
    norm := norm + acc[i] * acc[i];
  end loop;
  norm := sqrt(norm);
  if norm = 0 then
    norm := 1;
  end if;

  for i in 1 .. 256 loop
    parts := parts || to_char(acc[i] / norm, 'FM0.000000');
  end loop;

  return ('[' || array_to_string(parts, ',') || ']')::vector(256);
end;
$$;

create or replace function trg_products_vec()
returns trigger
language plpgsql
as $$
begin
  new.ingredient_vec := build_ingredient_vec(new.ingredients);
  if new.color_hex is not null and new.color_lab is null then
    new.color_lab := hex_to_lab(new.color_hex);
  end if;
  return new;
end;
$$;

-- sRGB(HEX) -> CIELAB (D65)
create or replace function hex_to_lab(p_hex text)
returns double precision[]
language plpgsql
immutable
as $$
declare
  h text := replace(p_hex, '#', '');
  r double precision; g double precision; b double precision;
  x double precision; y double precision; z double precision;
  fx double precision; fy double precision; fz double precision;
begin
  if length(h) <> 6 then
    return null;
  end if;
  r := ('x' || substr(h, 1, 2))::bit(8)::int / 255.0;
  g := ('x' || substr(h, 3, 2))::bit(8)::int / 255.0;
  b := ('x' || substr(h, 5, 2))::bit(8)::int / 255.0;

  r := case when r > 0.04045 then power((r + 0.055) / 1.055, 2.4) else r / 12.92 end;
  g := case when g > 0.04045 then power((g + 0.055) / 1.055, 2.4) else g / 12.92 end;
  b := case when b > 0.04045 then power((b + 0.055) / 1.055, 2.4) else b / 12.92 end;

  x := (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  y := (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
  z := (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  fx := case when x > 0.008856 then power(x, 1.0 / 3) else (7.787 * x) + 16.0 / 116 end;
  fy := case when y > 0.008856 then power(y, 1.0 / 3) else (7.787 * y) + 16.0 / 116 end;
  fz := case when z > 0.008856 then power(z, 1.0 / 3) else (7.787 * z) + 16.0 / 116 end;

  return array[(116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)];
end;
$$;

drop trigger if exists products_vec on products;
create trigger products_vec
before insert or update of ingredients, color_hex on products
for each row execute function trg_products_vec();
