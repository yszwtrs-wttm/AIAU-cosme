-- 使い切ったものは「ポーチに登録済み」の減点対象から外す。
-- 本体は 20260819000200_products_ranked_and_paging.sql と同じで、owned_items だけ絞る。

create or replace function search_products_page(
  p_q text default null,
  p_category text default null,
  p_mens boolean default false,
  p_sort text default 'recommended',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id bigint,
  name text,
  category text,
  is_mens boolean,
  price_yen int,
  volume numeric,
  volume_unit text,
  jan text,
  image_url text,
  color_hex text,
  ingredients text[],
  brand_name text,
  product_colors jsonb,
  ranked_rating numeric,
  owned boolean,
  avoided boolean,
  total_count bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  with avoided_inci as (
    select upper(im.inci) as inci
    from profile_allergens pa
    join ingredients_master im on im.id = pa.ingredient_id
    where pa.user_id = auth.uid()
  ),
  owned_items as (
    select ui.product_id
    from user_items ui
    where ui.user_id = auth.uid()
      and ui.finished_at is null
  ),
  input as (
    select nullif(btrim(coalesce(p_q, '')), '') as term
  ),
  -- 商品名 + ブランド名のあいまい一致は既存の RPC に任せる（候補だけを引く）。
  hits as (
    select sp.product_id, sp.score
    from input i
    cross join lateral search_products(
      i.term,
      nullif(p_category, ''),
      nullif(coalesce(p_mens, false), false),
      500
    ) sp
    where i.term is not null
  ),
  matched as (
    select
      pr.*,
      coalesce(h.score, 0) as search_score,
      exists (select 1 from owned_items o where o.product_id = pr.id) as owned,
      exists (
        select 1
        from unnest(pr.ingredients) as ing
        join avoided_inci a on a.inci = upper(ing)
      ) as avoided
    from products_ranked pr
    left join hits h on h.product_id = pr.id
    where ((select i.term from input i) is null or h.product_id is not null)
      and (p_category is null or p_category = '' or pr.category = p_category)
      and (not coalesce(p_mens, false) or pr.is_mens)
  ),
  scored as (
    select
      m.*,
      count(*) over () as total_count,
      coalesce(m.ranked_rating, 0)
        - case when m.owned then 2 else 0 end
        - case when m.avoided then 10 else 0 end as recommend_score
    from matched m
  )
  select
    s.id,
    s.name,
    s.category,
    s.is_mens,
    s.price_yen,
    s.volume,
    s.volume_unit,
    s.jan,
    s.image_url,
    s.color_hex,
    s.ingredients,
    b.name as brand_name,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('pos', pc.pos, 'shade_name', pc.shade_name, 'hex', pc.hex)
          order by pc.pos
        )
        from product_colors pc
        where pc.product_id = s.id
      ),
      '[]'::jsonb
    ) as product_colors,
    s.ranked_rating,
    s.owned,
    s.avoided,
    s.total_count
  from scored s
  join brands b on b.id = s.brand_id
  order by
    -- 検索語がある場合のおすすめ順は、まず一致度の高いものから。
    case
      when p_sort not in ('cheap', 'expensive', 'new', 'rating') then s.search_score
    end desc nulls last,
    case when p_sort = 'cheap' then s.price_yen end asc nulls last,
    case when p_sort = 'expensive' then s.price_yen end desc nulls last,
    case when p_sort = 'new' then s.created_at end desc nulls last,
    case when p_sort = 'rating' then s.ranked_rating end desc nulls last,
    case
      when p_sort not in ('cheap', 'expensive', 'new', 'rating') then s.recommend_score
    end desc nulls last,
    s.id desc
  limit greatest(coalesce(p_limit, 20), 0)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
