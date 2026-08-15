-- バーコードで読み取った JAN が商品マスタに無いときの受け皿。
-- 「登録がありません」で終わらせず、JAN と分かる範囲の情報（商品名・ブランド・写真）を
-- リクエストとして残して、あとから商品マスタに追加できるようにする。

create table if not exists jan_requests (
  id           bigserial primary key,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  jan          text not null,
  product_name text,
  brand_name   text,
  note         text,
  image_path   text,
  status       text not null default 'pending'
                 check (status in ('pending', 'resolved', 'rejected')),
  product_id   bigint references products(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- 同じ人が同じ JAN を何度も送っても 1 行にまとめる（送信ボタンの連打も含めて）。
create unique index if not exists jan_requests_user_jan_key
  on jan_requests (user_id, jan);

create index if not exists jan_requests_jan_idx on jan_requests (jan);
create index if not exists jan_requests_status_idx on jan_requests (status);

alter table jan_requests enable row level security;

-- 自分が出したリクエストだけ読める。商品化の判断（status / product_id の更新）は
-- 運用側（service role）で行うので、更新・削除のポリシーは作らない。
drop policy if exists "own jan requests readable" on jan_requests;
create policy "own jan requests readable" on jan_requests
  for select using (auth.uid() = user_id);

drop policy if exists "own jan requests insertable" on jan_requests;
create policy "own jan requests insertable" on jan_requests
  for insert to authenticated with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- Storage
-- リクエストに添える写真。公開読み取り、書き込みは自分の uid フォルダ配下だけ。
insert into storage.buckets (id, name, public)
values ('jan-requests', 'jan-requests', true)
on conflict (id) do nothing;

drop policy if exists "jan requests public read" on storage.objects;
create policy "jan requests public read" on storage.objects
  for select using (bucket_id = 'jan-requests');

drop policy if exists "jan requests owner write" on storage.objects;
create policy "jan requests owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'jan-requests'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "jan requests owner update" on storage.objects;
create policy "jan requests owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'jan-requests'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
