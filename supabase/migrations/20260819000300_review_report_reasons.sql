-- 通報の理由を選べるようにする。押し間違えは取り消せる（行を消す）。
-- 同一ユーザーの二重通報は既存の unique (review_id, user_id) で弾く。

alter table review_reports drop constraint if exists review_reports_reason_check;
alter table review_reports add constraint review_reports_reason_check
  check (reason in ('ad', 'image_reuse', 'irrelevant', 'fake', 'offensive', 'other'));

drop policy if exists "own reports deletable" on review_reports;
create policy "own reports deletable" on review_reports
  for delete to authenticated using (auth.uid() = user_id);

-- 不正検出の再計算が flags を総入れ替えするので、通報由来の 'reported' と除外を残す。
create or replace function recompute_review_trust(p_product_id bigint)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  with base as (
    select r.id, r.body, r.rating, r.posted_at, r.author_key, r.image_phash, r.report_count, p.brand_id
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
      b.report_count,
      array_remove(array[
        case when st.id is not null then 'similar_text' end,
        case when bu.id is not null then 'burst' end,
        case when bb.id is not null then 'brand_bias' end,
        case when bp.id is not null then 'pr_boilerplate' end,
        case when ir.id is not null then 'image_reuse' end,
        case when b.report_count >= 3 then 'reported' end
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
      )::numeric as trust,
      report_count >= 3 as reported
    from scored
  )
  update reviews r
  set flags = f.flags,
      trust_score = f.trust,
      excluded = f.trust < 0.5 or f.reported
  from final f
  where r.id = f.id
    and (r.flags is distinct from f.flags
         or r.trust_score is distinct from f.trust
         or r.excluded is distinct from (f.trust < 0.5 or f.reported));
end;
$$;

-- 通報が 3 件を超えたら総合評価から外す（表示は残す）。
-- 取り消しで 3 件を割ったら通報由来の除外を解き、不正検出の結果で再判定する。
create or replace function trg_review_reports_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review bigint;
  v_count int;
  v_product bigint;
begin
  if tg_op = 'DELETE' then
    v_review := old.review_id;
  else
    v_review := new.review_id;
  end if;

  select count(*) into v_count from review_reports where review_id = v_review;
  select product_id into v_product from reviews where id = v_review;

  -- 件数だけ書き、'reported' と除外の判定は recompute_review_trust に任せる。
  update reviews set report_count = v_count where id = v_review;

  if v_product is not null then
    perform recompute_review_trust(v_product);
  end if;
  return null;
end;
$$;

drop trigger if exists review_reports_apply on review_reports;
create trigger review_reports_apply after insert or delete on review_reports
for each row execute function trg_review_reports_apply();
