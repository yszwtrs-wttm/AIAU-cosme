-- 容量あたり価格（単価）でのコスパ比較。
--   * unit_price_yen: price_yen / volume の生成列。容量未登録（or 0）は null にして並び替えで最後に回す。
--   * unit_price_unit: 単価の単位。表記揺れ（mL / ML）を潰して比較・表示に使う。
-- g と mL は化粧品では同程度に扱えるので単位をまたいだ比較も許すが、単位はそのまま表示する。

alter table products
  add column if not exists unit_price_yen numeric
    generated always as (
      case
        when volume is not null and volume > 0 then round(price_yen::numeric / volume, 2)
      end
    ) stored,
  add column if not exists unit_price_unit text
    generated always as (
      case
        when volume is not null and volume > 0 then lower(btrim(volume_unit))
      end
    ) stored;

create index if not exists products_unit_price_idx on products (unit_price_yen nulls last);

-- 安い代替に単価を持たせる。単価が高いだけの「小容量で安い」候補を見分けられるようにする。
drop function if exists find_cheaper_dupes(bigint, integer, double precision);

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
  savings int,
  volume numeric,
  volume_unit text,
  unit_price_yen numeric,
  unit_price_savings numeric
)
language sql
stable
set search_path = public, pg_temp
as $$
  with target as (select * from products where id = p_product_id)
  select
    p.id, b.name, p.name, p.price_yen, p.color_hex, p.image_url,
    s.ing_sim, s.delta_e, s.score, t.price_yen - p.price_yen,
    p.volume, p.volume_unit, p.unit_price_yen,
    case
      when p.unit_price_yen is not null and t.unit_price_yen is not null
        then t.unit_price_yen - p.unit_price_yen
    end
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
