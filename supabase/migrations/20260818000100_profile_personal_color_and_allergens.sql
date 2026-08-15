-- プロフィールの拡張。
--   * avatar_url: デフォルトの色アイコンに加えて、好きな画像をアイコンにできるようにする。
--   * personal_color: イエベ/ブルベの4分類。色の提案でトーンの合う色を優先するために持つ。
--   * profile_allergens: 避けたい成分を成分マスタから選んで登録する（表記揺れを避けるため自由入力にしない）。

-- ---------------------------------------------------------------- profiles
alter table profiles add column if not exists avatar_url text;

alter table profiles add column if not exists personal_color text;

do $$
begin
  alter table profiles add constraint profiles_personal_color_check
    check (personal_color in ('spring', 'summer', 'autumn', 'winter'));
exception
  when duplicate_object then null;
end
$$;

-- ---------------------------------------------------------------- profile_allergens
-- 避けたい成分。本人だけが読み書きできる（肌の悩みに近い情報なので公開しない）。
create table if not exists profile_allergens (
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ingredient_id bigint not null references ingredients_master(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, ingredient_id)
);

alter table profile_allergens enable row level security;

drop policy if exists "own allergens readable" on profile_allergens;
create policy "own allergens readable" on profile_allergens
  for select using (auth.uid() = user_id);

drop policy if exists "own allergens insertable" on profile_allergens;
create policy "own allergens insertable" on profile_allergens
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own allergens deletable" on profile_allergens;
create policy "own allergens deletable" on profile_allergens
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------- Storage
-- アイコン画像。公開読み取り、書き込みは自分の uid フォルダ配下だけ。
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
