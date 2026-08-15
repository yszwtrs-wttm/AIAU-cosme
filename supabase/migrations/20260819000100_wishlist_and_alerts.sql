-- 「気になる（ウィッシュリスト）」と、その商品にまつわる通知。
--   * wishlist_items: 保留中の候補。手持ち(user_items)とは別物として持つ。
--   * product_price_history: 価格の変化を残して、値下がりを検出できるようにする。
--   * wishlist_alerts: 「手持ちと被った」「値下がりした」の通知。
--     文言は出さず、判定に使った数値だけ持つ（言い回しは src/lib/wording.ts に集約する方針）。

-- ---------------------------------------------------------------- wishlist_items
create table if not exists wishlist_items (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table wishlist_items enable row level security;

drop policy if exists "own wishlist readable" on wishlist_items;
create policy "own wishlist readable" on wishlist_items
  for select using (auth.uid() = user_id);

drop policy if exists "own wishlist insertable" on wishlist_items;
create policy "own wishlist insertable" on wishlist_items
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own wishlist deletable" on wishlist_items;
create policy "own wishlist deletable" on wishlist_items
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------- 価格履歴
create table if not exists product_price_history (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references products(id) on delete cascade,
  price_yen   int not null,
  recorded_at timestamptz not null default now()
);

create index if not exists product_price_history_product_idx
  on product_price_history (product_id, recorded_at desc);

alter table product_price_history enable row level security;

drop policy if exists "price history readable" on product_price_history;
create policy "price history readable" on product_price_history for select using (true);

-- 今の価格を起点として1点だけ入れておく（次の変更から差分が取れる）。
insert into product_price_history (product_id, price_yen)
select p.id, p.price_yen
from products p
where not exists (select 1 from product_price_history h where h.product_id = p.id);

-- ---------------------------------------------------------------- 通知
create table if not exists wishlist_alerts (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  -- 通知の対象になったウィッシュ商品
  product_id         bigint not null references products(id) on delete cascade,
  kind               text not null check (kind in ('overlap', 'price_drop')),
  -- overlap のとき、被った手持ち商品
  related_product_id bigint references products(id) on delete cascade,
  ing_sim            double precision,
  delta_e            double precision,
  score              double precision,
  old_price_yen      int,
  new_price_yen      int,
  read_at            timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists wishlist_alerts_user_idx on wishlist_alerts (user_id, created_at desc);

-- 同じ組み合わせの被り通知を溜めない。
create unique index if not exists wishlist_alerts_overlap_uniq
  on wishlist_alerts (user_id, product_id, related_product_id)
  where kind = 'overlap';

alter table wishlist_alerts enable row level security;

drop policy if exists "own alerts readable" on wishlist_alerts;
create policy "own alerts readable" on wishlist_alerts
  for select using (auth.uid() = user_id);

-- 既読にする / 消すのは本人だけ。作るのはトリガー（security definer）だけなので insert は許さない。
drop policy if exists "own alerts updatable" on wishlist_alerts;
create policy "own alerts updatable" on wishlist_alerts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own alerts deletable" on wishlist_alerts;
create policy "own alerts deletable" on wishlist_alerts
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------- 被り通知
-- ポーチに商品が入った時点で、その人のウィッシュのうち実質同じものを通知する。
-- 判定は既存の dupe_score（成分 cosine + ΔE）と同じ基準を使う。
create or replace function trg_user_items_wishlist_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into wishlist_alerts (user_id, product_id, kind, related_product_id, ing_sim, delta_e, score)
  select
    new.user_id, w.product_id, 'overlap', new.product_id, s.ing_sim, s.delta_e, s.score
  from wishlist_items w
  join products wp on wp.id = w.product_id
  join products np on np.id = new.product_id
  cross join lateral (
    select
      1 - (wp.ingredient_vec <=> np.ingredient_vec) as ing_sim,
      lab_delta_e(wp.color_lab, np.color_lab) as delta_e
  ) raw
  cross join lateral (
    select raw.ing_sim, raw.delta_e, dupe_score(raw.ing_sim, raw.delta_e) as score
  ) s
  where w.user_id = new.user_id
    and wp.id <> np.id
    and wp.category = np.category
    and s.score >= 0.5
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists user_items_wishlist_overlap on user_items;
create trigger user_items_wishlist_overlap
after insert on user_items
for each row execute function trg_user_items_wishlist_overlap();

-- ---------------------------------------------------------------- 値下がり通知
create or replace function trg_products_price_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.price_yen = old.price_yen then
    return new;
  end if;

  insert into product_price_history (product_id, price_yen) values (new.id, new.price_yen);

  if new.price_yen < old.price_yen then
    insert into wishlist_alerts (user_id, product_id, kind, old_price_yen, new_price_yen)
    select w.user_id, new.id, 'price_drop', old.price_yen, new.price_yen
    from wishlist_items w
    where w.product_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists products_price_history on products;
create trigger products_price_history
after update of price_yen on products
for each row execute function trg_products_price_history();

-- ---------------------------------------------------------------- Realtime
-- 値下がりは自分の操作では起きないので、開いている画面に届くようにしておく。
do $$
begin
  alter publication supabase_realtime add table wishlist_alerts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;
