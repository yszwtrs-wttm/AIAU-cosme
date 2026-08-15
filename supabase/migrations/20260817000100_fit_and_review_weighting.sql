-- コンセプトの再整理にあわせた変更。
--   * 口コミは「ログイン済みなら書ける」。持っているかどうかは自己申告なので投稿条件にしない。
--     ただし登録済みの人の声は集計で少し重く見る（過大評価された商品が上に来ないようにする）。
--   * 「買わなかった金額」は根拠のない数字なので機能ごと削除する。
--   * ランキング用に、件数が少ない商品が満点で上に来ないよう補正した評価を持つ。

-- ---------------------------------------------------------------- 投稿ゲートの緩和
drop policy if exists "reviews insertable by owner" on reviews;

create policy "reviews insertable by account" on reviews
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

-- ---------------------------------------------------------------- 登録済みかどうか
-- 集計の重み付けと「この商品を登録している人」の表示に使う。投稿の可否には使わない。
alter table reviews add column if not exists owner_verified boolean not null default false;

create or replace function trg_reviews_fill_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
begin
  if new.user_id is not null then
    select handle into v_handle from profiles where user_id = new.user_id;
    new.author_key := coalesce(v_handle, new.user_id::text);
    if new.author_name is null or new.author_name = '' then
      new.author_name := coalesce(v_handle, 'user');
    end if;
    new.owner_verified := exists (
      select 1 from user_items ui
      where ui.user_id = new.user_id and ui.product_id = new.product_id
    );
  end if;
  return new;
end;
$$;

update reviews r
set owner_verified = true
where r.user_id is not null
  and not r.owner_verified
  and exists (
    select 1 from user_items ui
    where ui.user_id = r.user_id and ui.product_id = r.product_id
  );

-- ---------------------------------------------------------------- 集計
-- adjusted_rating は「信用できる口コミだけの重み付き平均」。
-- 重み = 不正判定のスコア × 登録済みなら 1.3 倍。
-- 列を足すので作り直す。
drop view if exists product_score;
drop view if exists product_rating_summary;

create view product_rating_summary
with (security_invoker = true) as
with weighted as (
  select
    r.product_id,
    r.rating,
    r.excluded,
    r.owner_verified,
    r.trust_score * (case when r.owner_verified then 1.3 else 1.0 end) as weight
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

-- 「点数は高いが信用できる口コミが少ない商品」を上に出さないための補正評価。
-- 全体平均を 3 件分の下駄として混ぜる（ベイズ補正）。
create view product_score
with (security_invoker = true) as
with global as (
  select coalesce(avg(rating), 4.0)::numeric as mean
  from reviews
  where not excluded
)
select
  s.product_id,
  s.counted_count,
  s.adjusted_rating,
  round(
    (
      (s.counted_count * coalesce(s.adjusted_rating, g.mean) + 3 * g.mean)
      / (s.counted_count + 3)
    )::numeric,
    2
  ) as ranked_rating
from product_rating_summary s
cross join global g;

-- ---------------------------------------------------------------- 節約額の削除
drop table if exists skipped_purchases;
