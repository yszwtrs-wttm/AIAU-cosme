-- 検索が0件のときの立て直しを DB 側で支える。
--   * suggest_products: 表記ゆれ・打ち間違いに強い「もしかして」候補。pg_trgm の類似度上位を返す。
--   * product_requests: 商品自体が無いときの「商品の追加をリクエスト」を受け取る。

-- ---------------------------------------------------------------- もしかして
create index if not exists products_name_trgm_idx on products using gin (name gin_trgm_ops);
create index if not exists brands_name_trgm_idx on brands using gin (name gin_trgm_ops);

-- 絞り込みは意図的に無視する（0件の原因が絞り込みでも、キーワードに近い商品を出したい）。
drop function if exists suggest_products(text, int);
create function suggest_products(p_q text, p_limit int default 6)
returns table (product_id bigint, sim double precision)
language sql
stable
set search_path = public, pg_temp
as $$
  -- 日本語の商品名は空白で区切られず長いので、全体を比べる similarity ではなく
  -- 「キーワードが名前の一部にどれだけ一致するか」を見る word_similarity を使う。
  select p.id, greatest(word_similarity(p_q, p.name), word_similarity(p_q, b.name)) as sim
  from products p
  join brands b on b.id = p.brand_id
  where coalesce(trim(p_q), '') <> ''
    and greatest(word_similarity(p_q, p.name), word_similarity(p_q, b.name)) > 0.2
  order by sim desc, p.id desc
  limit p_limit;
$$;

-- ---------------------------------------------------------------- 商品追加リクエスト
create table if not exists product_requests (
  id         bigint generated always as identity primary key,
  user_id    uuid default auth.uid() references auth.users(id) on delete set null,
  keyword    text not null,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists product_requests_created_idx on product_requests (created_at desc);

alter table product_requests enable row level security;

-- 誰でも出せる（閲覧はログイン不要な機能なので、リクエストもセッションの種類で塞がない）。
drop policy if exists "product requests insertable" on product_requests;
create policy "product requests insertable" on product_requests
  for insert to anon, authenticated with check (true);

-- 読めるのは自分が出したものだけ。
drop policy if exists "own product requests readable" on product_requests;
create policy "own product requests readable" on product_requests
  for select to authenticated using (auth.uid() = user_id);
