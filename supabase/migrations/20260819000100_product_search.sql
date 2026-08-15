-- 商品名検索を pg_trgm インデックス + ブランド名対応にする。
--   * products.name / brands.name に GIN trgm インデックスを張り、部分一致と類似度検索を両方インデックスで引く。
--   * 検索は商品名とブランド名の両方を対象にして similarity 順に並べる RPC に寄せる。
--   * `%` `_` `\` はワイルドカードにならないようにエスケープする（RPC 内で処理する）。

create extension if not exists pg_trgm;

create index if not exists products_name_trgm_idx on products using gin (name gin_trgm_ops);
create index if not exists brands_name_trgm_idx on brands using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------- 商品名 + ブランド名の検索
-- 戻すのは id と類似度だけ。商品の列はアプリ側の既存クエリ（RLS 経由）でそのまま引く。
create or replace function search_products(
  p_q text,
  p_category text default null,
  p_mens boolean default null,
  p_limit int default 200
)
returns table (product_id bigint, score double precision)
language sql
stable
set search_path = public, pg_temp
as $$
  with input as (
    select
      term,
      -- LIKE のメタ文字をエスケープして、`%` だけの入力が全件ヒットしないようにする。
      '%' || replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') || '%' as like_pat
    from (select nullif(btrim(coalesce(p_q, '')), '') as term) raw
    where raw.term is not null
  ),
  matched as (
    select p.id, greatest(similarity(p.name, i.term), word_similarity(i.term, p.name)) as score
    from input i
    join products p on p.name ilike i.like_pat escape '\' or p.name % i.term
    union all
    -- ブランド名でのヒットは商品名ヒットより少しだけ弱く扱う。
    select p.id, 0.9 * greatest(similarity(b.name, i.term), word_similarity(i.term, b.name)) as score
    from input i
    join brands b on b.name ilike i.like_pat escape '\' or b.name % i.term
    join products p on p.brand_id = b.id
  )
  select m.id, max(m.score)::double precision
  from matched m
  join products p on p.id = m.id
  where (p_category is null or p.category = p_category)
    and (p_mens is null or p.is_mens = p_mens)
  group by m.id
  order by max(m.score) desc, m.id desc
  limit p_limit;
$$;
