-- 避けたい成分（profile_allergens）でポーチを一括点検する。
--   * find_stash_allergen_hits: 手持ちのうち避けたい成分を含むものと、当たった成分名を返す。
--   * find_allergen_free_alternatives: 同カテゴリ・成分が近く、避けたい成分を含まない代替候補を返す。
-- どちらも auth.uid() の手持ちと避けたい成分を見るので security invoker のまま使う。

create or replace function find_stash_allergen_hits()
returns table (
  product_id bigint,
  brand text,
  name text,
  category text,
  price_yen int,
  color_hex text,
  image_url text,
  hit_ingredients text[]
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with mine as (
    select p.*, b.name as brand
    from user_items ui
    join products p on p.id = ui.product_id
    join brands b on b.id = p.brand_id
    where ui.user_id = auth.uid()
  ),
  avoided as (
    select im.inci, coalesce(nullif(im.name_ja, ''), im.inci) as label
    from profile_allergens pa
    join ingredients_master im on im.id = pa.ingredient_id
    where pa.user_id = auth.uid()
  )
  select
    m.id, m.brand, m.name, m.category, m.price_yen, m.color_hex, m.image_url,
    hit.labels
  from mine m
  cross join lateral (
    select array_agg(a.label order by a.label) as labels
    from avoided a
    where exists (
      select 1 from unnest(m.ingredients) as ing where upper(ing) = upper(a.inci)
    )
  ) hit
  where hit.labels is not null
  order by array_length(hit.labels, 1) desc, m.price_yen desc, m.id;
$$;

create or replace function find_allergen_free_alternatives(
  p_product_id bigint,
  p_limit int default 3,
  p_min_score double precision default 0.4
)
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
  price_diff int,
  owned boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with target as (select * from products where id = p_product_id),
  avoided as (
    select im.inci
    from profile_allergens pa
    join ingredients_master im on im.id = pa.ingredient_id
    where pa.user_id = auth.uid()
  )
  select
    p.id, b.name, p.name, p.category, p.price_yen, p.color_hex, p.image_url,
    s.ing_sim, s.delta_e, s.score,
    p.price_yen - t.price_yen,
    exists (
      select 1 from user_items ui
      where ui.user_id = auth.uid() and ui.product_id = p.id
    )
  from products p
  join brands b on b.id = p.brand_id
  cross join target t
  cross join lateral (
    select
      1 - (p.ingredient_vec <=> t.ingredient_vec) as ing_sim,
      products_min_delta_e(p.id, t.id) as delta_e
  ) raw
  cross join lateral (
    select raw.ing_sim, raw.delta_e, dupe_score(raw.ing_sim, raw.delta_e) as score
  ) s
  where p.id <> t.id
    and p.category = t.category
    and s.score >= p_min_score
    and not exists (
      select 1
      from avoided a
      join unnest(p.ingredients) as ing on upper(ing) = upper(a.inci)
    )
  order by s.score desc, p.price_yen asc
  limit p_limit;
$$;
