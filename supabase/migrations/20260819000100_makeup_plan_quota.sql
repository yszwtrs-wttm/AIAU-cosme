-- メイク提案の LLM 呼び出しは Edge Function に移した。
-- 費用が読めるように、1ユーザーあたりの日次回数を Postgres 側で数えて制限する。
-- 匿名セッション（お試し利用）は LLM 経路に入れない。

create table if not exists makeup_plan_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists makeup_plan_usage_user_created_idx
  on makeup_plan_usage (user_id, created_at desc);

-- 利用履歴はクライアントから触らせない。加算は下の security definer 関数だけが行う。
alter table makeup_plan_usage enable row level security;

/**
 * 日次枠を1つ消費する。枠が残っていなければ allowed = false を返し、加算しない。
 * 匿名セッションは呼べない（本アカウント限定）。
 */
create or replace function claim_makeup_plan_quota(p_limit int default 10)
returns table (allowed boolean, used int, quota int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_used int;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'real account required';
  end if;

  select count(*)::int into v_used
  from makeup_plan_usage u
  where u.user_id = v_user
    and u.created_at >= date_trunc('day', now());

  if v_used >= p_limit then
    return query select false, v_used, p_limit;
    return;
  end if;

  insert into makeup_plan_usage (user_id) values (v_user);
  return query select true, v_used + 1, p_limit;
end
$$;

revoke all on function claim_makeup_plan_quota(int) from public;
revoke all on function claim_makeup_plan_quota(int) from anon;
grant execute on function claim_makeup_plan_quota(int) to authenticated;
