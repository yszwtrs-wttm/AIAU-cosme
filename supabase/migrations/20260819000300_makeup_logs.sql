-- メイク記録（使ったアイテムのレシピ）
--   * 提案からワンタップで「この組み合わせで使った」を残せるようにする。
--   * 使用回数を user_items に集計して「買ったのに使っていない」手持ちを出す。

create table if not exists makeup_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  used_on    date not null default current_date,
  request    text,
  created_at timestamptz not null default now()
);

create index if not exists makeup_logs_user_idx on makeup_logs (user_id, used_on desc);

create table if not exists makeup_log_items (
  log_id     bigint not null references makeup_logs(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  pos        int not null default 0,
  primary key (log_id, product_id)
);

-- 使用回数の集計先。記録が入るたびに log_makeup が更新する。
alter table user_items add column if not exists use_count int not null default 0;
alter table user_items add column if not exists last_used_on date;

alter table makeup_logs enable row level security;
alter table makeup_log_items enable row level security;

drop policy if exists "own logs readable" on makeup_logs;
drop policy if exists "own logs insertable" on makeup_logs;
drop policy if exists "own logs deletable" on makeup_logs;

create policy "own logs readable" on makeup_logs for select using (auth.uid() = user_id);
create policy "own logs insertable" on makeup_logs
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );
create policy "own logs deletable" on makeup_logs for delete using (auth.uid() = user_id);

drop policy if exists "own log items readable" on makeup_log_items;
drop policy if exists "own log items insertable" on makeup_log_items;
drop policy if exists "own log items deletable" on makeup_log_items;

create policy "own log items readable" on makeup_log_items
  for select using (
    exists (select 1 from makeup_logs l where l.id = makeup_log_items.log_id and l.user_id = auth.uid())
  );
create policy "own log items insertable" on makeup_log_items
  for insert to authenticated
  with check (
    exists (select 1 from makeup_logs l where l.id = makeup_log_items.log_id and l.user_id = auth.uid())
  );
create policy "own log items deletable" on makeup_log_items
  for delete using (
    exists (select 1 from makeup_logs l where l.id = makeup_log_items.log_id and l.user_id = auth.uid())
  );

-- 記録の作成と使用回数の集計をまとめて行う。
-- 手持ちに無い商品が来た場合はポーチにも登録する（記録した=持っている）。
create or replace function log_makeup(
  p_product_ids bigint[],
  p_used_on date default current_date,
  p_request text default null
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_log_id bigint;
  v_ids bigint[];
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select array_agg(distinct id) into v_ids
  from unnest(coalesce(p_product_ids, '{}'::bigint[])) as id;

  if v_ids is null or array_length(v_ids, 1) = 0 then
    raise exception 'no products to log';
  end if;

  insert into makeup_logs (user_id, used_on, request)
  values (auth.uid(), coalesce(p_used_on, current_date), nullif(p_request, ''))
  returning id into v_log_id;

  insert into makeup_log_items (log_id, product_id, pos)
  select v_log_id, id, ord
  from unnest(v_ids) with ordinality as t(id, ord);

  insert into user_items (user_id, product_id, source)
  select auth.uid(), id, 'manual'
  from unnest(v_ids) as id
  on conflict (user_id, product_id) do nothing;

  update user_items ui
  set use_count = ui.use_count + 1,
      last_used_on = greatest(coalesce(ui.last_used_on, '0001-01-01'::date), coalesce(p_used_on, current_date))
  where ui.user_id = auth.uid()
    and ui.product_id = any (v_ids);

  return v_log_id;
end;
$$;

-- 記録から「よく使う色」を出す。色検索の初期値に使う。
create or replace function my_frequent_colors(p_limit int default 6)
returns table (product_id bigint, label text, color_hex text, use_count bigint)
language sql
security invoker
set search_path = public
as $$
  select p.id,
         b.name || ' ' || p.name as label,
         p.color_hex,
         count(*) as use_count
  from makeup_log_items li
  join makeup_logs l on l.id = li.log_id
  join products p on p.id = li.product_id
  join brands b on b.id = p.brand_id
  where l.user_id = auth.uid()
    and p.color_hex is not null
  group by p.id, b.name, p.name, p.color_hex
  order by count(*) desc, max(l.used_on) desc
  limit greatest(coalesce(p_limit, 6), 1);
$$;
