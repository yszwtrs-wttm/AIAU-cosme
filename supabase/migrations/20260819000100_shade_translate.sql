-- 手持ちのシェード（product_colors の 1 行）を起点に、他商品の「相当シェード」を返す。
-- find_by_color は写真から取った 1 色を起点にするが、こちらは登録済みの色番を起点にするため
-- 照明やカメラのずれが入らず、ΔE をそのまま根拠として出せる。

-- 指定した色に相当する、他商品のシェード。商品ごとに一番近い色だけを返す。
create or replace function find_shade_matches(
  p_product_id bigint,
  p_pos int,
  p_limit int default 24,
  p_max_delta double precision default 10
)
returns table (
  product_id bigint,
  brand text,
  name text,
  category text,
  price_yen int,
  image_url text,
  pos int,
  shade_name text,
  shade_hex text,
  delta_e double precision,
  price_diff int,
  owned boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with src as (
    select pc.lab, p.id as product_id, p.category, p.price_yen
    from product_colors pc
    join products p on p.id = pc.product_id
    where pc.product_id = p_product_id and pc.pos = p_pos and pc.lab is not null
  )
  select * from (
    select distinct on (p.id)
      p.id,
      b.name,
      p.name,
      p.category,
      p.price_yen,
      p.image_url,
      pc.pos,
      pc.shade_name,
      pc.hex,
      lab_delta_e(pc.lab, s.lab) as delta_e,
      p.price_yen - s.price_yen as price_diff,
      exists (
        select 1 from user_items ui
        where ui.user_id = auth.uid() and ui.product_id = p.id
      ) as owned
    from src s
    join products p on p.category = s.category and p.id <> s.product_id
    join brands b on b.id = p.brand_id
    join product_colors pc on pc.product_id = p.id
    where pc.lab is not null
    order by p.id, lab_delta_e(pc.lab, s.lab) asc
  ) best
  where best.delta_e <= p_max_delta
  order by best.delta_e asc, best.price_yen asc
  limit p_limit;
$$;

-- ポーチの各シェードについて「同じ色なのに安い商品」を返す。
-- 持っている色を買い直すときに、ブランドを変えれば安く済むケースを一覧にする。
create or replace function find_cheaper_shade_swaps(
  p_max_delta double precision default 3,
  p_limit int default 12
)
returns table (
  mine_product_id bigint,
  mine_label text,
  mine_pos int,
  mine_shade text,
  mine_hex text,
  mine_price int,
  product_id bigint,
  brand text,
  name text,
  shade_name text,
  shade_hex text,
  price_yen int,
  delta_e double precision,
  savings int
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with mine as (
    select
      p.id as product_id,
      br.name || ' ' || p.name as label,
      p.category,
      p.price_yen,
      pc.pos,
      pc.shade_name,
      pc.hex,
      pc.lab
    from user_items ui
    join products p on p.id = ui.product_id
    join brands br on br.id = p.brand_id
    join product_colors pc on pc.product_id = p.id
    where ui.user_id = auth.uid() and pc.lab is not null
  )
  select
    m.product_id,
    m.label,
    m.pos,
    m.shade_name,
    m.hex,
    m.price_yen,
    c.product_id,
    c.brand,
    c.name,
    c.shade_name,
    c.shade_hex,
    c.price_yen,
    c.delta_e,
    m.price_yen - c.price_yen
  from mine m
  join lateral (
    select
      p.id as product_id,
      b.name as brand,
      p.name as name,
      pc.shade_name,
      pc.hex as shade_hex,
      p.price_yen,
      lab_delta_e(pc.lab, m.lab) as delta_e
    from products p
    join brands b on b.id = p.brand_id
    join product_colors pc on pc.product_id = p.id
    where p.category = m.category
      and p.id <> m.product_id
      and p.price_yen < m.price_yen
      and pc.lab is not null
      and lab_delta_e(pc.lab, m.lab) <= p_max_delta
      and not exists (
        select 1 from user_items ui
        where ui.user_id = auth.uid() and ui.product_id = p.id
      )
    order by p.price_yen asc, lab_delta_e(pc.lab, m.lab) asc
    limit 1
  ) c on true
  order by (m.price_yen - c.price_yen) desc
  limit p_limit;
$$;
