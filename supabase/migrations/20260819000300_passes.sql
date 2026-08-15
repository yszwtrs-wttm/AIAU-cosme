-- 見送り記録（買わずに済んだ判断）と、その共有。
--
-- 以前の skipped_purchases は「買わなかった金額」だけを持っていたので根拠がなく、消した。
-- ここでは判断したときの根拠（手持ちのどれと被ったか / 成分の cosine / ΔE / パレットの重複数）を
-- 一緒に固定して残す。あとから商品の価格や手持ちが変わっても、記録した時点の数値で説明できる。
--
-- 記録そのものは本人しか読めない。共有は share_id を知っている人だけが
-- get_shared_pass() 経由で読める（一覧はできない）。

create table if not exists passes (
  id               bigint generated always as identity primary key,
  share_id         uuid not null default gen_random_uuid() unique,
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id       bigint not null references products(id) on delete cascade,
  -- 見送った理由。dupe: 手持ちと被る / palette: 手持ちで色が作れる / price: 似ていて安い方がある / other
  reason           text not null default 'other' check (reason in ('dupe', 'palette', 'price', 'other')),
  -- 記録した時点の価格。買わずに済んだ金額はこれを使う（見積りではなく、見送った商品の値段）。
  price_yen        int not null,
  owned_product_id bigint references products(id) on delete set null,
  owned_label      text,
  ing_sim          double precision,
  delta_e          double precision,
  palette_total    int,
  palette_covered  int,
  alt_product_id   bigint references products(id) on delete set null,
  alt_label        text,
  alt_price_yen    int,
  created_at       timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists passes_user_idx on passes (user_id, created_at desc);

alter table passes enable row level security;

create policy "own passes readable" on passes for select using (auth.uid() = user_id);
create policy "own passes insertable" on passes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );
create policy "own passes updatable" on passes for update using (auth.uid() = user_id);
create policy "own passes deletable" on passes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------- 共有
-- share_id を知っている人だけが 1 件読める。OG 画像の生成もこれを使う。
create or replace function get_shared_pass(p_share_id uuid)
returns table (
  share_id        uuid,
  product_id      bigint,
  brand           text,
  name            text,
  category        text,
  price_yen       int,
  color_hex       text,
  reason          text,
  owned_label     text,
  ing_sim         double precision,
  delta_e         double precision,
  palette_total   int,
  palette_covered int,
  alt_label       text,
  alt_price_yen   int,
  author_name     text,
  author_handle   text,
  created_at      timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.share_id,
    s.product_id,
    b.name,
    p.name,
    p.category,
    s.price_yen,
    p.color_hex,
    s.reason,
    s.owned_label,
    s.ing_sim,
    s.delta_e,
    s.palette_total,
    s.palette_covered,
    s.alt_label,
    s.alt_price_yen,
    pr.display_name,
    pr.handle,
    s.created_at
  from passes s
  join products p on p.id = s.product_id
  join brands b on b.id = p.brand_id
  left join profiles pr on pr.user_id = s.user_id
  where s.share_id = p_share_id;
$$;

grant execute on function get_shared_pass(uuid) to anon, authenticated;
