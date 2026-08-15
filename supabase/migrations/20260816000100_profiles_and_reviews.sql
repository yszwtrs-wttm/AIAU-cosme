-- ユーザー体験の刷新にあわせた追加スキーマ。
--   * profiles: 表示名とアイコン。口コミの「名前を毎回手入力」を廃止するため。
--   * reviews: 投稿者を auth.users に紐付け、使用感スライダーと写真を持たせる。
--   * 投稿ゲート: 本アカウント(匿名でない) かつ 手持ちに登録済みの商品だけ投稿できる。
--   * skipped_purchases: 「買わなかった金額」の累計をマイページで見せる。

-- ---------------------------------------------------------------- profiles
create table if not exists profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  handle       text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  avatar_hue   int not null default 330 check (avatar_hue between 0 and 360),
  bio          text,
  skin_tone_hex text,
  skin_type    text check (skin_type in ('dry', 'normal', 'oily', 'combination', 'sensitive')),
  stash_public boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles readable" on profiles for select using (true);
create policy "own profile insertable" on profiles for insert with check (auth.uid() = user_id);
create policy "own profile updatable" on profiles for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------- user_items
-- バーコードで読んだ登録は「購入確認済み」として口コミの信頼に使う。
alter table user_items add column if not exists source text not null default 'manual'
  check (source in ('manual', 'scan', 'photo', 'quick'));

-- ---------------------------------------------------------------- reviews
alter table reviews add column if not exists user_id uuid references auth.users(id) on delete cascade;
-- 使用感。0..100 の軸を jsonb で持つ（カテゴリごとに軸名が変わるため列にしない）。
alter table reviews add column if not exists feel jsonb;
-- 端末単位の多重投稿検出用。生 IP は保存しない。
alter table reviews add column if not exists client_hash text;
alter table reviews add column if not exists report_count int not null default 0;

create index if not exists reviews_user_idx on reviews (user_id);

-- 投稿者の表示名・アイコンは口コミと一緒に取りたいので、profiles への参照も張る。
do $$
begin
  alter table reviews
    add constraint reviews_profile_fkey foreign key (user_id)
    references profiles(user_id) on delete cascade;
exception
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------- review_images
create table if not exists review_images (
  id         bigint generated always as identity primary key,
  review_id  bigint not null references reviews(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path       text not null,
  pos        int not null default 0,
  phash      text,
  created_at timestamptz not null default now(),
  unique (review_id, pos)
);

create index if not exists review_images_review_idx on review_images (review_id);

alter table review_images enable row level security;

create policy "review images readable" on review_images for select using (true);
create policy "own review images insertable" on review_images
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid())
  );
create policy "own review images deletable" on review_images
  for delete to authenticated using (auth.uid() = user_id);

-- 1 投稿あたり 4 枚まで。
create or replace function trg_review_images_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from review_images where review_id = new.review_id) >= 4 then
    raise exception '写真は1件の口コミに4枚までです';
  end if;
  return new;
end;
$$;

drop trigger if exists review_images_limit on review_images;
create trigger review_images_limit before insert on review_images
for each row execute function trg_review_images_limit();

-- 画像の使い回し検出は既存の recompute_review_trust が reviews.image_phash を見るので、
-- 先頭の写真の pHash を reviews 側にも書き戻して再判定を走らせる。
create or replace function trg_review_images_sync_phash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product bigint;
begin
  if new.pos = 0 and new.phash is not null then
    update reviews set image_phash = new.phash where id = new.review_id;
    select product_id into v_product from reviews where id = new.review_id;
    if v_product is not null then
      perform recompute_review_trust(v_product);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists review_images_sync_phash on review_images;
create trigger review_images_sync_phash after insert on review_images
for each row execute function trg_review_images_sync_phash();

-- ---------------------------------------------------------------- 通報
create table if not exists review_reports (
  id         bigint generated always as identity primary key,
  review_id  bigint not null references reviews(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason     text not null check (reason in ('ad', 'fake', 'offensive', 'other')),
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);

alter table review_reports enable row level security;

create policy "own reports readable" on review_reports for select using (auth.uid() = user_id);
create policy "reports insertable" on review_reports
  for insert to authenticated with check (auth.uid() = user_id);

-- 通報が 3 件を超えたら総合評価から外す（表示は残す）。
create or replace function trg_review_reports_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_product bigint;
begin
  select count(*) into v_count from review_reports where review_id = new.review_id;
  select product_id into v_product from reviews where id = new.review_id;

  update reviews
  set report_count = v_count,
      excluded = case when v_count >= 3 then true else excluded end,
      flags = case when v_count >= 3 and not ('reported' = any(flags))
                   then flags || 'reported' else flags end
  where id = new.review_id;

  if v_product is not null then
    perform recompute_review_trust(v_product);
  end if;
  return new;
end;
$$;

drop trigger if exists review_reports_apply on review_reports;
create trigger review_reports_apply after insert on review_reports
for each row execute function trg_review_reports_apply();

-- ---------------------------------------------------------------- 投稿ゲート
-- 匿名セッションでは書けない / 手持ちに登録した商品しか書けない / 連投は弾く。
drop policy if exists "reviews insertable" on reviews;

create policy "reviews insertable by owner" on reviews
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1 from user_items ui
      where ui.user_id = auth.uid() and ui.product_id = reviews.product_id
    )
  );

create policy "own reviews updatable" on reviews
  for update to authenticated using (auth.uid() = user_id);
create policy "own reviews deletable" on reviews
  for delete to authenticated using (auth.uid() = user_id);

create or replace function trg_reviews_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day int;
  v_same_product int;
  v_brand int;
begin
  if new.user_id is null then
    return new;   -- シード投入（サービスロール）はゲートの対象外
  end if;

  select count(*) into v_day
  from reviews
  where user_id = new.user_id and posted_at > now() - interval '24 hours';
  if v_day >= 5 then
    raise exception '1日に投稿できる口コミは5件までです';
  end if;

  select count(*) into v_same_product
  from reviews
  where user_id = new.user_id and product_id = new.product_id;
  if v_same_product >= 1 then
    raise exception '同じ商品への口コミは1件までです';
  end if;

  select count(*) into v_brand
  from reviews r
  join products p on p.id = r.product_id
  where r.user_id = new.user_id
    and p.brand_id = (select brand_id from products where id = new.product_id)
    and r.posted_at > now() - interval '24 hours';
  if v_brand >= 2 then
    raise exception '同じブランドへの口コミは1日2件までです';
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_rate_limit on reviews;
create trigger reviews_rate_limit before insert on reviews
for each row execute function trg_reviews_rate_limit();

-- 表示名は profiles から取る。author_name は投稿時に埋めない。
create or replace function trg_reviews_fill_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
begin
  if new.user_id is not null then
    select handle into v_handle from profiles where user_id = new.user_id;
    new.author_key := coalesce(v_handle, new.user_id::text);
    if new.author_name is null or new.author_name = '' then
      new.author_name := coalesce(v_handle, 'user');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_fill_author on reviews;
create trigger reviews_fill_author before insert on reviews
for each row execute function trg_reviews_fill_author();

-- ---------------------------------------------------------------- 使用感の集計
create or replace view product_feel_summary as
select
  r.product_id,
  count(*) filter (where r.feel is not null) as feel_count,
  jsonb_object_agg(k.key, k.avg_value) as feel
from reviews r
cross join lateral (
  select f.key, avg((f.value)::numeric) as avg_value
  from jsonb_each_text(coalesce(r.feel, '{}'::jsonb)) f(key, value)
  where f.value ~ '^[0-9.]+$'
  group by f.key
) k
where r.excluded = false
group by r.product_id;

-- ---------------------------------------------------------------- 買わなかった金額
create table if not exists skipped_purchases (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  price_yen  int not null,
  reason     text,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table skipped_purchases enable row level security;

create policy "own skips readable" on skipped_purchases for select using (auth.uid() = user_id);
create policy "own skips insertable" on skipped_purchases
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own skips deletable" on skipped_purchases
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------- Storage
insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

drop policy if exists "review images public read" on storage.objects;
create policy "review images public read" on storage.objects
  for select using (bucket_id = 'review-images');

drop policy if exists "review images owner write" on storage.objects;
create policy "review images owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "review images owner delete" on storage.objects;
create policy "review images owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'review-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
