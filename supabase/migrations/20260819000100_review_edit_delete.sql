-- 自分の口コミを編集・削除できるようにする。
--   * 更新時に投稿者を書き換えられないよう with check を足す。
--   * 商品・投稿者・投稿日時は編集で動かさない（評価の付け替え・なりすまし対策）。
--   * 編集と削除でも信頼度スコアを再計算する。

drop policy if exists "own reviews updatable" on reviews;
create policy "own reviews updatable" on reviews
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 編集で動かしてはいけない列を戻す。flags / trust_score / excluded は
-- recompute_review_trust が同じセッションで更新するので対象にしない。
create or replace function trg_reviews_lock_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    new.product_id := old.product_id;
    new.user_id := old.user_id;
    new.posted_at := old.posted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_lock_columns on reviews;
create trigger reviews_lock_columns before update on reviews
for each row execute function trg_reviews_lock_columns();

-- 削除でも再集計する（バースト判定などは他の口コミの評価にも効く）。
drop trigger if exists reviews_recompute on reviews;
create trigger reviews_recompute
after insert or delete or update of body, rating, image_phash, posted_at on reviews
for each row execute function trg_reviews_recompute();
