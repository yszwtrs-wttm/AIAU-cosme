-- 水やグリセリンのようにどの商品にも入っている成分は、似ている根拠にならない。
-- 出現頻度の逆数(IDF)で重みを下げ、「その処方に固有の成分」が効くようにする。
alter table ingredients_master add column if not exists df int not null default 0;
alter table ingredients_master add column if not exists idf double precision not null default 1;

create or replace function build_ingredient_vec(p_ingredients text[])
returns vector(256)
language plpgsql
stable
as $$
declare
  acc double precision[] := array_fill(0::double precision, array[256]);
  i int;
  d int;
  f double precision;
  w double precision;
  norm double precision := 0;
  parts text[] := '{}';
begin
  if p_ingredients is null then
    return null;
  end if;

  for i in 1 .. array_length(p_ingredients, 1) loop
    select dim, idf into d, f
    from ingredients_master
    where lower(inci) = lower(btrim(p_ingredients[i]))
    limit 1;

    if d is not null then
      -- 配合順の重み（全成分表示は配合量の多い順）× IDF
      w := (1.0 / (ln(i + 1) / ln(2.0))) * coalesce(f, 1);
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

-- 商品を入れ替えたら呼ぶ。DF を数え直して全商品のベクトルを再生成する。
create or replace function refresh_ingredient_idf()
returns void
language plpgsql
as $$
declare
  total int;
begin
  select count(*) into total from products;
  if total = 0 then
    return;
  end if;

  update ingredients_master im
  set df = sub.df,
      idf = ln(1 + total::double precision / (1 + sub.df))
  from (
    select im2.id, count(p.id) as df
    from ingredients_master im2
    left join products p on exists (
      select 1 from unnest(p.ingredients) ing where lower(ing) = lower(im2.inci)
    )
    group by im2.id
  ) sub
  where im.id = sub.id;

  update products set ingredient_vec = build_ingredient_vec(ingredients);
end;
$$;
