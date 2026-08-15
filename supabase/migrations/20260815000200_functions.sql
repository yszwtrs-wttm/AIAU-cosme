-- 類似検索・色差・不正検出をすべて Postgres 側に置く。
-- アプリは「判定」を持たず、Supabase が判定エンジンになる。

-- ---------------------------------------------------------------- 色差 (CIEDE2000)
create or replace function mod_deg(x double precision)
returns double precision
language sql
immutable
as $$ select x - floor(x / 360) * 360 $$;

create or replace function lab_delta_e(lab1 double precision[], lab2 double precision[])
returns double precision
language plpgsql
immutable
as $$
declare
  l1 double precision; a1 double precision; b1 double precision;
  l2 double precision; a2 double precision; b2 double precision;
  c1 double precision; c2 double precision; cbar double precision; g double precision;
  a1p double precision; a2p double precision; c1p double precision; c2p double precision;
  h1p double precision; h2p double precision;
  dlp double precision; dcp double precision; dhp double precision; dhp_big double precision;
  lbarp double precision; cbarp double precision; hbarp double precision;
  t double precision; dtheta double precision; rc double precision;
  sl double precision; sc double precision; sh double precision; rt double precision;
begin
  if lab1 is null or lab2 is null or array_length(lab1, 1) <> 3 or array_length(lab2, 1) <> 3 then
    return null;
  end if;
  l1 := lab1[1]; a1 := lab1[2]; b1 := lab1[3];
  l2 := lab2[1]; a2 := lab2[2]; b2 := lab2[3];

  c1 := sqrt(a1 * a1 + b1 * b1);
  c2 := sqrt(a2 * a2 + b2 * b2);
  cbar := (c1 + c2) / 2;
  g := 0.5 * (1 - sqrt(power(cbar, 7) / (power(cbar, 7) + power(25, 7))));

  a1p := (1 + g) * a1;
  a2p := (1 + g) * a2;
  c1p := sqrt(a1p * a1p + b1 * b1);
  c2p := sqrt(a2p * a2p + b2 * b2);

  h1p := case when b1 = 0 and a1p = 0 then 0 else mod_deg(degrees(atan2(b1, a1p)) + 360) end;
  h2p := case when b2 = 0 and a2p = 0 then 0 else mod_deg(degrees(atan2(b2, a2p)) + 360) end;

  dlp := l2 - l1;
  dcp := c2p - c1p;

  if c1p * c2p = 0 then
    dhp := 0;
  elsif abs(h2p - h1p) <= 180 then
    dhp := h2p - h1p;
  elsif h2p - h1p > 180 then
    dhp := h2p - h1p - 360;
  else
    dhp := h2p - h1p + 360;
  end if;
  dhp_big := 2 * sqrt(c1p * c2p) * sin(radians(dhp) / 2);

  lbarp := (l1 + l2) / 2;
  cbarp := (c1p + c2p) / 2;

  if c1p * c2p = 0 then
    hbarp := h1p + h2p;
  elsif abs(h1p - h2p) <= 180 then
    hbarp := (h1p + h2p) / 2;
  elsif h1p + h2p < 360 then
    hbarp := (h1p + h2p + 360) / 2;
  else
    hbarp := (h1p + h2p - 360) / 2;
  end if;

  t := 1 - 0.17 * cos(radians(hbarp - 30))
         + 0.24 * cos(radians(2 * hbarp))
         + 0.32 * cos(radians(3 * hbarp + 6))
         - 0.20 * cos(radians(4 * hbarp - 63));
  dtheta := 30 * exp(-power((hbarp - 275) / 25, 2));
  rc := 2 * sqrt(power(cbarp, 7) / (power(cbarp, 7) + power(25, 7)));
  sl := 1 + (0.015 * power(lbarp - 50, 2)) / sqrt(20 + power(lbarp - 50, 2));
  sc := 1 + 0.045 * cbarp;
  sh := 1 + 0.015 * cbarp * t;
  rt := -sin(radians(2 * dtheta)) * rc;

  return sqrt(power(dlp / sl, 2) + power(dcp / sc, 2) + power(dhp_big / sh, 2)
              + rt * (dcp / sc) * (dhp_big / sh));
end;
$$;

-- ---------------------------------------------------------------- 総合スコア
-- 成分 cosine 類似度と色差から「実質同じか」の 0-1 スコアを作る。
create or replace function dupe_score(ing_sim double precision, delta_e double precision)
returns double precision
language sql
immutable
as $$
  select case
    when delta_e is null then greatest(0, least(1, ing_sim))
    -- ΔE 0 で 1.0、ΔE 10 で 0 になる線形項と成分類似度の加重平均
    else greatest(0, least(1, 0.6 * ing_sim + 0.4 * greatest(0, 1 - delta_e / 10)))
  end;
$$;

-- ---------------------------------------------------------------- 被り検出
-- 「買おうとしている商品」と「手持ち」を突き合わせる。
create or replace function find_duplicates_in_stash(p_product_id bigint, p_min_score double precision default 0.5)
returns table (
  product_id bigint,
  brand text,
  name text,
  category text,
  price_yen int,
  color_hex text,
  image_url text,
  ing_sim double precision,
  delta_e double precision,
  score double precision,
  price_diff int
)
language sql
stable
security invoker
as $$
  with target as (
    select * from products where id = p_product_id
  )
  select
    p.id, b.name, p.name, p.category, p.price_yen, p.color_hex, p.image_url,
    s.ing_sim, s.delta_e, s.score,
    p.price_yen - t.price_yen
  from user_items ui
  join products p on p.id = ui.product_id
  join brands b on b.id = p.brand_id
  cross join target t
  cross join lateral (
    select
      1 - (p.ingredient_vec <=> t.ingredient_vec) as ing_sim,
      lab_delta_e(p.color_lab, t.color_lab) as delta_e
  ) raw
  cross join lateral (
    select raw.ing_sim, raw.delta_e, dupe_score(raw.ing_sim, raw.delta_e) as score
  ) s
  where ui.user_id = auth.uid()
    and p.id <> t.id
    and p.category = t.category
    and s.score >= p_min_score
  order by s.score desc;
$$;

-- ---------------------------------------------------------------- 安い代替
create or replace function find_cheaper_dupes(p_product_id bigint, p_limit int default 5, p_min_score double precision default 0.55)
returns table (
  product_id bigint,
  brand text,
  name text,
  price_yen int,
  color_hex text,
  image_url text,
  ing_sim double precision,
  delta_e double precision,
  score double precision,
  savings int
)
language sql
stable
as $$
  with target as (select * from products where id = p_product_id)
  select
    p.id, b.name, p.name, p.price_yen, p.color_hex, p.image_url,
    s.ing_sim, s.delta_e, s.score, t.price_yen - p.price_yen
  from products p
  join brands b on b.id = p.brand_id
  cross join target t
  cross join lateral (
    select
      1 - (p.ingredient_vec <=> t.ingredient_vec) as ing_sim,
      lab_delta_e(p.color_lab, t.color_lab) as delta_e
  ) raw
  cross join lateral (
    select raw.ing_sim, raw.delta_e, dupe_score(raw.ing_sim, raw.delta_e) as score
  ) s
  where p.id <> t.id
    and p.category = t.category
    and p.price_yen < t.price_yen
    and s.score >= p_min_score
  order by s.score desc, p.price_yen asc
  limit p_limit;
$$;

-- ---------------------------------------------------------------- 手持ちの中の被り
create or replace function find_stash_overlaps(p_min_score double precision default 0.6)
returns table (
  a_id bigint, a_label text, a_price int, a_hex text,
  b_id bigint, b_label text, b_price int, b_hex text,
  ing_sim double precision, delta_e double precision, score double precision
)
language sql
stable
security invoker
as $$
  with mine as (
    select p.*, br.name as brand
    from user_items ui
    join products p on p.id = ui.product_id
    join brands br on br.id = p.brand_id
    where ui.user_id = auth.uid()
  )
  select
    x.id, x.brand || ' ' || x.name, x.price_yen, x.color_hex,
    y.id, y.brand || ' ' || y.name, y.price_yen, y.color_hex,
    s.ing_sim, s.delta_e, s.score
  from mine x
  join mine y on y.id > x.id and y.category = x.category
  cross join lateral (
    select
      1 - (x.ingredient_vec <=> y.ingredient_vec) as ing_sim,
      lab_delta_e(x.color_lab, y.color_lab) as delta_e
  ) raw
  cross join lateral (
    select raw.ing_sim, raw.delta_e, dupe_score(raw.ing_sim, raw.delta_e) as score
  ) s
  where s.score >= p_min_score
  order by s.score desc;
$$;

-- ---------------------------------------------------------------- 色から探す
create or replace function find_by_color(p_lab double precision[], p_category text default null, p_limit int default 8)
returns table (
  product_id bigint, brand text, name text, category text, price_yen int,
  color_hex text, image_url text, delta_e double precision
)
language sql
stable
as $$
  select p.id, b.name, p.name, p.category, p.price_yen, p.color_hex, p.image_url,
         lab_delta_e(p.color_lab, p_lab) as delta_e
  from products p
  join brands b on b.id = p.brand_id
  where p.color_lab is not null
    and (p_category is null or p.category = p_category)
  order by lab_delta_e(p.color_lab, p_lab) asc
  limit p_limit;
$$;
