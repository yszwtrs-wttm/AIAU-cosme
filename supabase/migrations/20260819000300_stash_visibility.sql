-- ポーチ（所持コスメ）の公開範囲。
--   * 所持コスメは購買履歴に近い情報なので、既定を非公開にする。
--   * 公開範囲は public / link / private の3段階。link は URL を知っている人だけが見られる。
--   * link のトークンは本人だけが読めるよう profiles とは別テーブルに置く
--     （profiles の select ポリシーは全員 true のため、同じ表に置くとトークンが漏れる）。

-- ---------------------------------------------------------------- profiles
-- 旧ポリシーが stash_public を参照しているので、先に落としてから列を差し替える。
drop policy if exists "public stash readable" on user_items;

alter table profiles add column if not exists stash_visibility text not null default 'private';

do $$
begin
  alter table profiles add constraint profiles_stash_visibility_check
    check (stash_visibility in ('public', 'link', 'private'));
exception
  when duplicate_object then null;
end
$$;

-- 既存ユーザーは今の公開状態をそのまま引き継ぐ（既定の非公開は新規ユーザーにだけ効く）。
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'stash_public'
  ) then
    execute $mig$
      update profiles
      set stash_visibility = case when stash_public then 'public' else 'private' end
    $mig$;
    alter table profiles drop column stash_public;
  end if;
end
$$;

create policy "public stash readable" on user_items
  for select using (
    exists (
      select 1 from profiles p
      where p.user_id = user_items.user_id and p.stash_visibility = 'public'
    )
  );

-- ---------------------------------------------------------------- profile_share_tokens
-- リンク限定公開用の推測できないトークン。読めるのは本人だけ。
create table if not exists profile_share_tokens (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table profile_share_tokens enable row level security;

drop policy if exists "own share token readable" on profile_share_tokens;
create policy "own share token readable" on profile_share_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "own share token insertable" on profile_share_tokens;
create policy "own share token insertable" on profile_share_tokens
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own share token updatable" on profile_share_tokens;
create policy "own share token updatable" on profile_share_tokens
  for update to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------- shared_stash_product_ids
-- ユーザーページに出す商品 id。
--   * public: 誰でも見られる（user_items のポリシーと同じ条件）。
--   * link  : トークンが一致したときだけ返す。トークンは本人しか読めないので
--             security definer にして照合だけをここで行う。
create or replace function shared_stash_product_ids(p_handle text, p_token uuid default null)
returns setof bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ui.product_id
  from user_items ui
  join profiles p on p.user_id = ui.user_id
  left join profile_share_tokens t on t.user_id = p.user_id
  where p.handle = p_handle
    and (
      p.stash_visibility = 'public'
      or (p.stash_visibility = 'link' and p_token is not null and t.token = p_token)
    );
$$;

grant execute on function shared_stash_product_ids(text, uuid) to anon, authenticated;
