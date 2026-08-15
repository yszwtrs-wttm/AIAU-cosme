-- 「買わなかった」を記録して数字で見せる。
--
-- 20260817000100 で skipped_purchases を消したのは「根拠のない金額」だったから。
-- 今回は根拠を必ず一緒に残す。
--   * price_yen  : 見送った時点の products.price_yen（サーバ側で読む。クライアントの値は使わない）
--   * saved_yen  : 実際に払わずに済んだ金額。安い代替に置き換えた見送りは差額だけを入れる。
--   * evidence_* : 判定に使った手持ち商品 / 安い代替商品と、その時点の色差・成分類似度。
create table if not exists skipped_purchases (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id   bigint not null references products(id) on delete cascade,
  price_yen    int not null check (price_yen >= 0),
  saved_yen    int not null check (saved_yen >= 0),
  reason       text not null check (
    reason in ('own_similar_color', 'own_similar_formula', 'cheaper_alternative', 'not_fit', 'other')
  ),
  evidence_product_id bigint references products(id) on delete set null,
  evidence_price_yen  int,
  evidence_delta_e    numeric,
  evidence_ing_sim    numeric,
  created_at   timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists skipped_purchases_user_created_idx
  on skipped_purchases (user_id, created_at desc);

alter table skipped_purchases enable row level security;

drop policy if exists "own skips readable" on skipped_purchases;
create policy "own skips readable" on skipped_purchases
  for select using (auth.uid() = user_id);

drop policy if exists "own skips insertable" on skipped_purchases;
create policy "own skips insertable" on skipped_purchases
  for insert to authenticated with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

drop policy if exists "own skips updatable" on skipped_purchases;
create policy "own skips updatable" on skipped_purchases
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own skips deletable" on skipped_purchases;
create policy "own skips deletable" on skipped_purchases
  for delete to authenticated using (auth.uid() = user_id);
