-- ポーチを「持っている / 持っていない」の2値から、使い切りまでを追える在庫にする。
--   * 残量はざっくり3段階（たっぷり / 半分くらい / 残りわずか）。％は使う人が答えられない。
--   * 開封日を持つと「そろそろ使い切りどき」が言える。
--   * 使い切ったものは被り判定から外す（持っていないのと同じ扱いにする）。

alter table user_items
  add column if not exists remaining_level text not null default 'plenty'
    check (remaining_level in ('plenty', 'half', 'low')),
  add column if not exists finished_at date;

comment on column user_items.remaining_level is '残量の3段階。plenty=たっぷり / half=半分くらい / low=残りわずか';
comment on column user_items.finished_at is '使い切った日。null でなければ在庫としては数えない';

-- 既に入っている remaining_pct を3段階に寄せる。以降は remaining_level を正とする。
update user_items
set remaining_level = case
  when remaining_pct <= 30 then 'low'
  when remaining_pct <= 70 then 'half'
  else 'plenty'
end
where remaining_level = 'plenty';

-- ---------------------------------------------------------------- 被り検出
-- 残量と開封日を返す。「持っているが残りわずか」は買ってよい側に寄せるため、判定文言で使う。
drop function if exists find_duplicates_in_stash(bigint, double precision);

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
  price_diff int,
  remaining_level text,
  opened_at date
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with target as (
    select * from products where id = p_product_id
  )
  select
    p.id, b.name, p.name, p.category, p.price_yen, p.color_hex, p.image_url,
    s.ing_sim, s.delta_e, s.score,
    p.price_yen - t.price_yen,
    ui.remaining_level, ui.opened_at
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
    and ui.finished_at is null
    and p.id <> t.id
    and p.category = t.category
    and s.score >= p_min_score
  order by s.score desc;
$$;

-- ---------------------------------------------------------------- 手持ちの中の被り
-- 使い切ったものは在庫ではないので、被りとして数えない。
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
  with mine as (
    select p.*, br.name as brand
    from user_items ui
    join products p on p.id = ui.product_id
    join brands br on br.id = p.brand_id
    where ui.user_id = auth.uid()
      and ui.finished_at is null
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

-- ---------------------------------------------------------------- 手持ちで似た色が出せるか
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
  with mine as (
    select pc.product_id, pc.shade_name, pc.hex, pc.lab, br.name || ' ' || p.name as label
    from user_items ui
    join products p on p.id = ui.product_id
    join brands br on br.id = p.brand_id
    join product_colors pc on pc.product_id = p.id
    where ui.user_id = auth.uid()
      and ui.finished_at is null
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
    from mine m
    order by lab_delta_e(m.lab, target.lab) asc
    limit 1
  ) nearest on nearest.delta_e <= p_max_delta
  where target.product_id = p_product_id
  order by target.pos;
$$;
