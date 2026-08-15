-- サクラ判定の透明性。
--   * 除外された口コミの理由（flags）はもともと reviews に入っているが、
--     投稿者が「なぜ外れたか」を確かめて反論する導線がなかった。
--   * review_appeals: 投稿者からの再判定リクエスト。判定前後のスコアと理由を残す。
--   * request_review_recheck: 本人だけが呼べる再判定。recompute_review_trust を回し、
--     結果（除外が外れたか）を申し立てに書き戻す。

create table if not exists review_appeals (
  id           bigint generated always as identity primary key,
  review_id    bigint not null references reviews(id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message      text not null check (char_length(btrim(message)) between 1 and 500),
  status       text not null default 'open' check (status in ('open', 'restored', 'kept')),
  flags_before text[] not null default '{}',
  flags_after  text[] not null default '{}',
  created_at   timestamptz not null default now(),
  judged_at    timestamptz
);

create index if not exists review_appeals_review_idx on review_appeals (review_id);

alter table review_appeals enable row level security;

-- 申し立ての中身は投稿者本人だけに見せる。
create policy "own appeals readable" on review_appeals
  for select using (auth.uid() = user_id);

create policy "own appeals insertable" on review_appeals
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid())
  );

-- 再判定リクエスト。申し立てを記録してから判定をやり直す。
-- 通報による除外（report_count >= 3）は自動判定では戻さない。
create or replace function request_review_recheck(p_review_id bigint, p_message text)
returns table (excluded boolean, flags text[], status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review reviews;
  v_appeal_id bigint;
  v_recent int;
begin
  select * into v_review from reviews where id = p_review_id;
  if v_review is null or v_review.user_id is distinct from auth.uid() then
    raise exception '自分の口コミにだけ再判定をリクエストできます';
  end if;
  if not v_review.excluded then
    raise exception 'この口コミは点数に入っています';
  end if;

  select count(*) into v_recent
  from review_appeals a
  where a.review_id = p_review_id and a.created_at > now() - interval '24 hours';
  if v_recent >= 3 then
    raise exception '再判定のリクエストは1日3件までです';
  end if;

  insert into review_appeals (review_id, user_id, message, flags_before)
  values (p_review_id, auth.uid(), p_message, v_review.flags)
  returning id into v_appeal_id;

  perform recompute_review_trust(v_review.product_id);

  select * into v_review from reviews where id = p_review_id;

  -- 通報が3件以上ある口コミは、自動判定が通っても除外のまま残す。
  if v_review.report_count >= 3 and not v_review.excluded then
    update reviews
    set excluded = true,
        flags = case when 'reported' = any(flags) then flags else flags || 'reported' end
    where id = p_review_id;
    select * into v_review from reviews where id = p_review_id;
  end if;

  update review_appeals
  set flags_after = v_review.flags,
      status = case when v_review.excluded then 'kept' else 'restored' end,
      judged_at = now()
  where id = v_appeal_id;

  return query
  select v_review.excluded, v_review.flags,
         case when v_review.excluded then 'kept' else 'restored' end;
end;
$$;

revoke all on function request_review_recheck(bigint, text) from public;
grant execute on function request_review_recheck(bigint, text) to authenticated;
