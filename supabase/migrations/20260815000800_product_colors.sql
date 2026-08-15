-- アイシャドウパレットのように 1 商品が複数色を持つケースに対応する。
-- 単色商品は「色が 1 つの商品」として同じテーブルで扱う。

alter table products drop constraint if exists products_category_check;
alter table products add constraint products_category_check
  check (category in ('lip', 'foundation', 'shampoo', 'treatment', 'sunscreen', 'bb', 'eyeshadow'));

create table if not exists product_colors (
  id         bigint generated always as identity primary key,
  product_id bigint not null references products(id) on delete cascade,
  pos   int not null default 0,
  shade_name text not null,
  hex        text not null,
  lab        double precision[],
  unique (product_id, pos)
);

create index if not exists product_colors_product_idx on product_colors (product_id);

alter table product_colors enable row level security;
create policy "product_colors readable" on product_colors for select using (true);

create or replace function trg_product_colors_lab()
returns trigger
language plpgsql
as $$
begin
  new.lab := hex_to_lab(new.hex);
  return new;
end;
$$;

drop trigger if exists product_colors_lab on product_colors;
create trigger product_colors_lab
before insert or update of hex on product_colors
for each row execute function trg_product_colors_lab();

-- 既存の単色商品を移行する。
insert into product_colors (product_id, pos, shade_name, hex)
select p.id, 0, coalesce(nullif(regexp_replace(p.name, '^.*?\d{2,3}\s+', ''), p.name), '本体色'), p.color_hex
from products p
where p.color_hex is not null
on conflict (product_id, pos) do nothing;

-- ---------------------------------------------------------------- 色の比較（複数色対応）
-- 2 商品の「一番近い色同士」の ΔE。単色同士なら従来と同じ値になる。
create or replace function products_min_delta_e(p_a bigint, p_b bigint)
returns double precision
language sql
stable
set search_path = public, pg_temp
as $$
  select min(lab_delta_e(ca.lab, cb.lab))
  from product_colors ca
  join product_colors cb on cb.product_id = p_b
  where ca.product_id = p_a;
$$;

-- パレットの各色について、手持ちの中で一番近い色を返す。
-- 「10 色中 8 色は手持ちで再現できる」を数値で言うための関数。
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

-- ---------------------------------------------------------------- 既存関数を複数色対応に差し替え
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
set search_path = public, pg_temp
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
      products_min_delta_e(p.id, t.id) as delta_e
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
set search_path = public, pg_temp
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
      products_min_delta_e(p.id, t.id) as delta_e
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
      products_min_delta_e(x.id, y.id) as delta_e
  ) raw
  cross join lateral (
    select raw.ing_sim, raw.delta_e, dupe_score(raw.ing_sim, raw.delta_e) as score
  ) s
  where s.score >= p_min_score
  order by s.score desc;
$$;

-- 色検索も色単位で行い、どの色が当たったかを返す。
drop function if exists find_by_color(double precision[], text, int);
create function find_by_color(p_lab double precision[], p_category text default null, p_limit int default 8)
returns table (
  product_id bigint, brand text, name text, category text, price_yen int,
  color_hex text, image_url text, delta_e double precision,
  shade_name text, shade_hex text
)
language sql
stable
set search_path = public, pg_temp
as $$
  select * from (
    select distinct on (p.id)
      p.id, b.name, p.name, p.category, p.price_yen, p.color_hex, p.image_url,
      lab_delta_e(pc.lab, p_lab) as delta_e,
      pc.shade_name, pc.hex
    from products p
    join brands b on b.id = p.brand_id
    join product_colors pc on pc.product_id = p.id
    where pc.lab is not null
      and (p_category is null or p.category = p_category)
    order by p.id, lab_delta_e(pc.lab, p_lab) asc
  ) best
  order by best.delta_e asc
  limit p_limit;
$$;
