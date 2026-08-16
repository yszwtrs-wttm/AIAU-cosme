-- 口コミの「参考になった」投票。
--   * 1人1票（主キーで担保）。自分の口コミには投票できない。匿名セッションも投票できない。
--   * 票数は reviews.helpful_count に非正規化して持つ（並び替えと信頼度の再計算で使う）。
--   * 票は信頼度スコアの加点材料にもするが、サクラ検出と矛盾しないように
--     不正フラグが立っている口コミには加点しない（票で除外を取り消せないようにする）。

-- ---------------------------------------------------------------- review_votes
create table if not exists review_votes (
  review_id  bigint not null references reviews(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists review_votes_review_idx on review_votes (review_id);

alter table review_votes enable row level security;

drop policy if exists "review votes readable" on review_votes;
create policy "review votes readable" on review_votes for select using (true);

-- 投稿と同じゲート（本アカウントのみ）。加えて自分の口コミへの自作自演を弾く。
drop policy if exists "review votes insertable by account" on review_votes;
create policy "review votes insertable by account" on review_votes
  for insert to authenticated with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and not exists (
      select 1 from reviews r where r.id = review_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "own review votes deletable" on review_votes;
create policy "own review votes deletable" on review_votes
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------- 票数
alter table reviews add column if not exists helpful_count int not null default 0;

create or replace function trg_review_votes_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_review bigint := coalesce(new.review_id, old.review_id);
  v_product bigint;
begin
  update reviews r
  set helpful_count = (select count(*) from review_votes v where v.review_id = r.id)
  where r.id = v_review
  returning r.product_id into v_product;

  if v_product is not null then
    perform recompute_review_trust(v_product);
  end if;
  return null;
end;
$$;

drop trigger if exists review_votes_sync on review_votes;
create trigger review_votes_sync
after insert or delete on review_votes
for each row execute function trg_review_votes_sync();

update reviews r
set helpful_count = (select count(*) from review_votes v where v.review_id = r.id);

-- ---------------------------------------------------------------- 信頼度への加点
-- 除外の判定は今までどおり不正フラグだけで決める。票は「フラグが無い口コミ」の
-- 重みを最大 +0.15 だけ持ち上げるので、票を集めたサクラが集計に入り込むことはない。
create or replace function recompute_review_trust(p_product_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  with base as (
    select r.id, r.body, r.rating, r.posted_at, r.author_key, r.image_phash, r.helpful_count, p.brand_id
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
      b.helpful_count,
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
      )::numeric as base_trust,
      (case
         when cardinality(flags) = 0 then least(0.15, 0.05 * helpful_count)
         else 0
       end)::numeric as helpful_bonus
    from scored
  )
  update reviews r
  set flags = f.flags,
      trust_score = f.base_trust + f.helpful_bonus,
      excluded = f.base_trust < 0.5
  from final f
  where r.id = f.id
    and (r.flags is distinct from f.flags
         or r.trust_score is distinct from (f.base_trust + f.helpful_bonus)
         or r.excluded is distinct from (f.base_trust < 0.5));
end;
$$;

-- 票が入ったら重みが変わるので、既存データも一度洗い直す。
do $$
declare
  v_product bigint;
begin
  for v_product in select distinct product_id from reviews loop
    perform recompute_review_trust(v_product);
  end loop;
end
$$;
