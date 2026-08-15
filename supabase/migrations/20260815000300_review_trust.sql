-- 口コミ不正検出。削除せず「除外」して理由を開示する。
-- 判定ロジックは全部 Postgres 側。新しい口コミが入ると trigger で再計算され、
-- Realtime 経由で UI の補正スコアが動く。

create or replace function recompute_review_trust(p_product_id bigint)
returns void
language plpgsql
as $$
begin
  with base as (
    select r.id, r.body, r.rating, r.posted_at, r.author_key, r.image_phash, p.brand_id
    from reviews r
    join products p on p.id = r.product_id
    where r.product_id = p_product_id
  ),
  -- 1. 同一商品内で文体が近い口コミ同士（テンプレ投稿クラスタ）
  similar_text as (
    select distinct a.id
    from base a
    join base b on b.id <> a.id and similarity(a.body, b.body) > 0.45
  ),
  -- 2. 投稿バースト（24時間以内に高評価が3件以上）
  burst as (
    select distinct a.id
    from base a
    where a.rating >= 5
      and (
        select count(*) from base b
        where b.rating >= 5 and abs(extract(epoch from (b.posted_at - a.posted_at))) < 86400
      ) >= 3
  ),
  -- 3. 同一ブランドへの偏重（同じ投稿者が同ブランドに満点を量産）
  brand_bias as (
    select distinct a.id
    from base a
    where (
      select count(*)
      from reviews r2
      join products p2 on p2.id = r2.product_id
      where r2.author_key = a.author_key and p2.brand_id = a.brand_id and r2.rating >= 5
    ) >= 3
  ),
  -- 4. PR / 案件の定型表現
  boilerplate as (
    select id from base
    where body ~ '(PR|ＰＲ|提供|案件|モニター|ステマ|タイアップ|プレゼント企画|#pr)'
  ),
  -- 5. 画像の使い回し（同じ pHash が複数の口コミに出現）
  image_reuse as (
    select distinct a.id
    from base a
    where a.image_phash is not null
      and (select count(*) from reviews r3 where r3.image_phash = a.image_phash) > 1
  ),
  scored as (
    select
      b.id,
      array_remove(array[
        case when st.id is not null then 'similar_text' end,
        case when bu.id is not null then 'burst' end,
        case when bb.id is not null then 'brand_bias' end,
        case when bp.id is not null then 'pr_boilerplate' end,
        case when ir.id is not null then 'image_reuse' end
      ], null) as flags
    from base b
    left join similar_text st on st.id = b.id
    left join burst bu on bu.id = b.id
    left join brand_bias bb on bb.id = b.id
    left join boilerplate bp on bp.id = b.id
    left join image_reuse ir on ir.id = b.id
  ),
  final as (
    select
      id,
      flags,
      greatest(0, 1
        - (case when 'similar_text'  = any(flags) then 0.35 else 0 end)
        - (case when 'burst'         = any(flags) then 0.25 else 0 end)
        - (case when 'brand_bias'    = any(flags) then 0.30 else 0 end)
        - (case when 'pr_boilerplate'= any(flags) then 0.20 else 0 end)
        - (case when 'image_reuse'   = any(flags) then 0.40 else 0 end)
      )::numeric as trust
    from scored
  )
  update reviews r
  set flags = f.flags,
      trust_score = f.trust,
      excluded = f.trust < 0.5
  from final f
  where r.id = f.id
    and (r.flags is distinct from f.flags
         or r.trust_score is distinct from f.trust
         or r.excluded is distinct from (f.trust < 0.5));
end;
$$;

create or replace function trg_reviews_recompute()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  perform recompute_review_trust(coalesce(new.product_id, old.product_id));
  return null;
end;
$$;

drop trigger if exists reviews_recompute on reviews;
create trigger reviews_recompute
after insert or update of body, rating, image_phash, posted_at on reviews
for each row execute function trg_reviews_recompute();

-- 生の評価と補正後の評価を並べて見せるためのビュー
create or replace view product_rating_summary
with (security_invoker = true) as
select
  p.id as product_id,
  count(r.id) as review_count,
  round(avg(r.rating)::numeric, 2) as raw_rating,
  round(avg(r.rating) filter (where not r.excluded)::numeric, 2) as adjusted_rating,
  count(r.id) filter (where r.excluded) as excluded_count,
  coalesce(
    (select array_agg(distinct f) from reviews r2, unnest(r2.flags) f
     where r2.product_id = p.id and r2.excluded),
    '{}'
  ) as exclusion_reasons
from products p
left join reviews r on r.product_id = p.id
group by p.id;

-- Realtime: 補正スコアの更新をそのまま UI に流す
alter publication supabase_realtime add table reviews;
alter table reviews replica identity full;
