-- 判定ロジックが動いていることを確認するスモークテスト。
-- 使い方: npm run db:smoke（内部で psql に流す。ローカル Supabase が起動している必要がある）
-- シードは決定論的に生成しているので、結果は毎回同じになる。

\set ON_ERROR_STOP on
\pset pager off

\echo '== 1. シード件数 =='
select
  (select count(*) from brands) as brands,
  (select count(*) from products) as products,
  (select count(*) from product_colors) as product_colors,
  (select count(*) from reviews) as reviews,
  (select count(*) from ingredients_master) as ingredients;

\echo '== 2. 成分ベクトルがトリガで全商品に入っているか（missing は 0 であること）=='
select
  count(*) filter (where ingredient_vec is null) as missing,
  count(*) filter (where ingredient_vec is not null) as filled
from products;

\echo '== 3. 色の HEX -> Lab 変換がトリガで入っているか（missing は 0 であること）=='
select
  count(*) filter (where lab is null) as missing,
  count(*) filter (where lab is not null) as filled
from product_colors
where hex is not null;

\echo '== 4. CIEDE2000 の SQL 実装（同色は 0、白と黒は 100 前後）=='
select
  round(lab_delta_e(array[50,10,10], array[50,10,10])::numeric, 3) as same_color,
  round(lab_delta_e(array[100,0,0], array[0,0,0])::numeric, 1) as white_vs_black;

\echo '== 5. pg_trgm の商品検索（ブランド名の部分一致でもヒットする）=='
select b.name as brand, p.name, round(s.score::numeric, 3) as score
from search_products('リップ', null, null, 5) s
join products p on p.id = s.product_id
join brands b on b.id = p.brand_id
order by s.score desc, p.id;

\echo '== 6. 成分 cosine + 色差での「似ていて安い商品」 =='
with target as (
  select p.id, b.name as brand, p.name, p.price_yen
  from products p join brands b on b.id = p.brand_id
  where p.category = 'lip'
  order by p.price_yen desc limit 1
)
select t.brand || ' ' || t.name || ' (' || t.price_yen || '円)' as target,
       d.brand || ' ' || d.name as cheaper,
       d.price_yen,
       round(d.ing_sim::numeric, 3) as ing_sim,
       round(d.delta_e::numeric, 2) as delta_e,
       round(d.score::numeric, 3) as score
from target t, find_cheaper_dupes(t.id, 3, 0.4) d;

\echo '== 7. 画像から取った色に近い商品を探す（ΔE 昇順）=='
select brand, name, color_hex, round(delta_e::numeric, 2) as delta_e
from find_by_color(array[55.0, 45.0, 20.0], null, 5);

\echo '== 8. 口コミの信頼度が計算され、集計に反映されているか =='
select count(*) as reviews,
       count(*) filter (where trust_score is not null) as scored,
       count(*) filter (where excluded) as excluded_from_score
from reviews;

\echo '== 9. IDF の再計算（pg_cron が毎日叩いている関数を手で実行）=='
select refresh_ingredient_idf_logged();
select products, ingredients, status from ingredient_idf_status;
