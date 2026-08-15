-- 未ログインでも被り検出を試せるサンプルポーチのため、
-- 「手持ち = auth.uid() の user_items」を前提にしていた計算を、商品 id の配列で行える形に切り出す。
-- 既存の手持ち向け関数は、その配列版に手持ちを渡すだけにする。

create or replace function find_overlaps_in_set(
  p_product_ids bigint[],
  p_min_score double precision default 0.6
)
returns table (
  a_id bigint, a_label text, a_price int, a_hex text,
  b_id bigint, b_label text, b_price int, b_hex text,
  ing_sim double precision, delta_e double precision, score double precision
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with picked as (
    select p.*, br.name as brand
    from products p
    join brands br on br.id = p.brand_id
    where p.id = any(p_product_ids)
  )
  select
    x.id, x.brand || ' ' || x.name, x.price_yen, x.color_hex,
    y.id, y.brand || ' ' || y.name, y.price_yen, y.color_hex,
    s.ing_sim, s.delta_e, s.score
  from picked x
  join picked y on y.id > x.id and y.category = x.category
  cross join lateral (
    select
      1 - (x.ingredient_vec <=> y.ingredient_vec) as ing_sim,
      products_min_delta_e(x.id, y.id) as delta_e
  ) raw
  cross join lateral (
    select raw.ing_sim, raw.delta_e, dupe_score(raw.ing_sim, raw.delta_e) as score
  ) s
  where s.score >= p_min_score
  order by s.score desc;
$$;

create or replace function find_palette_coverage_in_set(
  p_product_id bigint,
  p_product_ids bigint[],
  p_max_delta double precision default 5
)
returns table (
  pos int,
  shade_name text,
  shade_hex text,
  owned_product_id bigint,
  owned_label text,
  owned_shade text,
  owned_hex text,
  delta_e double precision
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with picked as (
    select pc.product_id, pc.shade_name, pc.hex, pc.lab, br.name || ' ' || p.name as label
    from products p
    join brands br on br.id = p.brand_id
    join product_colors pc on pc.product_id = p.id
    where p.id = any(p_product_ids)
      and p.id <> p_product_id
  )
  select
    target.pos,
    target.shade_name,
    target.hex,
    nearest.product_id,
    nearest.label,
    nearest.shade_name,
    nearest.hex,
    nearest.delta_e
  from product_colors target
  left join lateral (
    select m.product_id, m.label, m.shade_name, m.hex, lab_delta_e(m.lab, target.lab) as delta_e
    from picked m
    order by lab_delta_e(m.lab, target.lab) asc
    limit 1
  ) nearest on nearest.delta_e <= p_max_delta
  where target.product_id = p_product_id
  order by target.pos;
$$;

create or replace function find_stash_overlaps(p_min_score double precision default 0.6)
returns table (
  a_id bigint, a_label text, a_price int, a_hex text,
  b_id bigint, b_label text, b_price int, b_hex text,
  ing_sim double precision, delta_e double precision, score double precision
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select *
  from find_overlaps_in_set(
    array(select ui.product_id from user_items ui where ui.user_id = auth.uid()),
    p_min_score
  );
$$;

create or replace function find_palette_coverage(p_product_id bigint, p_max_delta double precision default 5)
returns table (
  pos int,
  shade_name text,
  shade_hex text,
  owned_product_id bigint,
  owned_label text,
  owned_shade text,
  owned_hex text,
  delta_e double precision
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select *
  from find_palette_coverage_in_set(
    p_product_id,
    array(select ui.product_id from user_items ui where ui.user_id = auth.uid()),
    p_max_delta
  );
$$;

grant execute on function find_overlaps_in_set(bigint[], double precision) to anon, authenticated;
grant execute on function find_palette_coverage_in_set(bigint, bigint[], double precision) to anon, authenticated;
