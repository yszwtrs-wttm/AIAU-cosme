-- 成分ベクトルの近傍検索を ivfflat から HNSW に移す。
-- ivfflat はデータ投入後にインデックスを作り直す前提で、lists も件数に依存する
-- （空のテーブルに lists = 10 で作ってあったので、投入後は再現率も速度も読めない）。
-- HNSW は挿入時にグラフを育てるので、件数が増えても作り直しが要らない。

drop index if exists products_ivec_idx;
create index if not exists products_ivec_idx
  on products using hnsw (ingredient_vec vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------- 安い代替（HNSW 経由）
-- 従来は products を全件走査して 1 件ずつ距離を計算していたため、
-- インデックスは使われていなかった（距離が where / order by ではなくスコアの材料だった）。
--
-- HNSW を使うには「あるベクトルとの距離で order by して limit」の形が必要なので、
--   1. 候補取り : order by ingredient_vec <=> 対象ベクトル limit 候補数（← ここで HNSW を使う）
--   2. 絞り込み : 候補に対してだけ ΔE とスコアを計算する
-- の 2 段にする。plpgsql で対象ベクトルを変数に入れてから渡すのは、
-- 相関サブクエリのままだとプランナがインデックスを使わないことがあるため。
--
-- 退行させないための保険:
--   score = 0.6 * ing_sim + 0.4 * max(0, 1 - ΔE / 10) なので、色差が 0（色の項が最大 0.4）でも
--   閾値に届かない類似度＝距離が v_max_distance より遠い商品は、そもそも結果に入らない。
--   候補の中で一番遠いものが v_max_distance を超えていれば「閾値を満たしうる商品は
--   すべて候補に入った」と言えるので ANN の結果をそのまま使う。
--   覆えていなければ（閾値を満たしうる商品が候補数より多い場合）、
--   従来どおり全件走査に落とす。
create or replace function find_cheaper_dupes(p_product_id bigint, p_limit int default 5, p_min_score double precision default 0.55)
returns table (
  product_id bigint,
  brand text,
  name text,
  price_yen int,
  color_hex text,
  image_url text,
  ing_sim double precision,
  delta_e double precision,
  score double precision,
  savings int
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_vec vector(256);
  v_pool int := greatest(p_limit * 20, 200);
  -- score >= p_min_score を満たしうる cosine 距離の上限
  v_max_distance double precision := 1 - greatest(0, (p_min_score - 0.4) / 0.6);
  v_ids bigint[];
  v_worst double precision;
  v_scan_all boolean := true;
begin
  select p.ingredient_vec into v_vec from products p where p.id = p_product_id;

  if v_vec is not null then
    -- limit まできちんと候補を返させる（ef_search 未満で打ち切られると取りこぼす）
    perform set_config('hnsw.ef_search', least(v_pool, 1000)::text, true);
    perform set_config('hnsw.iterative_scan', 'strict_order', true);

    with cand as (
      select p.id, p.ingredient_vec <=> v_vec as distance
      from products p
      where p.ingredient_vec is not null
      order by p.ingredient_vec <=> v_vec
      limit v_pool
    )
    select array_agg(cand.id), max(cand.distance)
    into v_ids, v_worst
    from cand;

    v_scan_all := v_worst is null or v_worst <= v_max_distance;
  end if;

  return query
  with target as (select * from products where id = p_product_id),
  -- 高い ΔE の計算を候補だけに閉じ込めたいので、絞り込みを先に materialize する。
  base as materialized (
    select p.id, p.brand_id, p.name, p.price_yen, p.color_hex, p.image_url, p.ingredient_vec
    from products p
    cross join target t
    where p.id <> t.id
      and p.category = t.category
      and p.price_yen < t.price_yen
      -- 候補の外は閾値に届かないので飛ばす。
      -- ベクトル未計算の商品は距離が出せないため候補判定から外し、従来どおり評価する。
      and (v_scan_all or p.ingredient_vec is null or p.id = any(v_ids))
  )
  select
    p.id, b.name, p.name, p.price_yen, p.color_hex, p.image_url,
    s.ing_sim, s.delta_e, s.score, t.price_yen - p.price_yen
  from base p
  join brands b on b.id = p.brand_id
  cross join target t
  cross join lateral (
    select
      1 - (p.ingredient_vec <=> t.ingredient_vec) as ing_sim,
      products_min_delta_e(p.id, t.id) as delta_e
  ) raw
  cross join lateral (
    select raw.ing_sim, raw.delta_e, dupe_score(raw.ing_sim, raw.delta_e) as score
  ) s
  where s.score >= p_min_score
  order by s.score desc, p.price_yen asc
  limit p_limit;
end;
$$;

-- find_duplicates_in_stash / find_stash_overlaps は手持ち（user_items）に限定した
-- 数十件の突き合わせなので、HNSW の近傍検索を挟むより全件の直接計算のほうが速い。
-- 近傍検索にすると手持ちの外の商品まで辿ってしまい閾値ぎりぎりの被りを取りこぼすため、
-- こちらは総当たりのままにする。
