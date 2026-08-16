-- 手持ち登録の有無による口コミ重み付けは意味がないため削除する。
-- 登録済みかどうかは表示用の owner_verified / owner_count として残す。
create or replace view product_rating_summary
with (security_invoker = true) as
with weighted as (
  select
    r.product_id,
    r.rating,
    r.excluded,
    r.owner_verified,
    r.trust_score as weight
  from reviews r
)
select
  p.id as product_id,
  count(w.rating) as review_count,
  round(avg(w.rating)::numeric, 2) as raw_rating,
  round(
    (
      sum(w.rating * w.weight) filter (where not w.excluded)
      / nullif(sum(w.weight) filter (where not w.excluded), 0)
    )::numeric,
    2
  ) as adjusted_rating,
  count(w.rating) filter (where w.excluded) as excluded_count,
  count(w.rating) filter (where not w.excluded) as counted_count,
  count(w.rating) filter (where not w.excluded and w.owner_verified) as owner_count,
  coalesce(
    (select array_agg(distinct f) from reviews r2, unnest(r2.flags) f
     where r2.product_id = p.id and r2.excluded),
    '{}'
  ) as exclusion_reasons
from products p
left join weighted w on w.product_id = p.id
group by p.id;
