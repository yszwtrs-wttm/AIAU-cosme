-- AIAU-cosme : "買わなくていい" を成分と色の数値で証明するための最小スキーマ
create extension if not exists vector;
create extension if not exists pg_trgm;

-- 成分マスタ。成分ベクトルの次元番号(dim)をここで固定する。
create table if not exists ingredients_master (
  id          bigint generated always as identity primary key,
  dim         int not null unique,
  inci        text not null unique,
  name_ja     text,
  functions   text[] not null default '{}',
  hazard_tags text[] not null default '{}'
);

create table if not exists brands (
  id       bigint generated always as identity primary key,
  name     text not null unique,
  is_demo  boolean not null default true
);

create table if not exists products (
  id            bigint generated always as identity primary key,
  brand_id      bigint not null references brands(id) on delete cascade,
  name          text not null,
  category      text not null check (category in ('lip', 'foundation', 'shampoo', 'treatment', 'sunscreen', 'bb')),
  is_mens       boolean not null default false,
  price_yen     int not null,
  volume        numeric,
  volume_unit   text,
  jan           text unique,
  image_url     text,
  color_hex     text,
  color_lab     double precision[],
  ingredients   text[] not null default '{}',
  -- 全成分表示は配合量の多い順。位置 i に w=1/log2(i+2) を掛けた重み付きベクトル。
  ingredient_vec vector(256),
  created_at    timestamptz not null default now()
);

create index if not exists products_category_idx on products (category);
create index if not exists products_price_idx on products (price_yen);
create index if not exists products_ivec_idx on products using ivfflat (ingredient_vec vector_cosine_ops) with (lists = 10);

create table if not exists user_items (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id  bigint not null references products(id) on delete cascade,
  opened_at   date,
  remaining_pct int not null default 100 check (remaining_pct between 0 and 100),
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists reviews (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references products(id) on delete cascade,
  author_name text not null,
  author_key  text not null,          -- デモ用の擬似アカウント識別子
  rating      int not null check (rating between 1 and 5),
  body        text not null,
  image_phash text,
  posted_at   timestamptz not null default now(),
  -- 不正検出の結果。Postgres 側の関数が書き込む。
  trust_score numeric not null default 1.0,
  excluded    boolean not null default false,
  flags       text[] not null default '{}'
);

create index if not exists reviews_product_idx on reviews (product_id);

create table if not exists review_investigations (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references products(id) on delete cascade,
  status      text not null default 'queued' check (status in ('queued', 'running', 'done')),
  report      text,
  created_at  timestamptz not null default now()
);

-- RLS: 手持ちは本人だけ。商品/成分/レビューは読み取り公開。
alter table products enable row level security;
alter table brands enable row level security;
alter table ingredients_master enable row level security;
alter table reviews enable row level security;
alter table review_investigations enable row level security;
alter table user_items enable row level security;

create policy "products readable" on products for select using (true);
create policy "brands readable" on brands for select using (true);
create policy "ingredients readable" on ingredients_master for select using (true);
create policy "reviews readable" on reviews for select using (true);
create policy "investigations readable" on review_investigations for select using (true);

create policy "own items readable" on user_items for select using (auth.uid() = user_id);
create policy "own items insertable" on user_items for insert with check (auth.uid() = user_id);
create policy "own items updatable" on user_items for update using (auth.uid() = user_id);
create policy "own items deletable" on user_items for delete using (auth.uid() = user_id);
