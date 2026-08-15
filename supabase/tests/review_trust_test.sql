-- 口コミの信頼度（recompute_review_trust）の pgTAP テスト。
-- 「どの兆候で何点引くか」「何点未満で集計から外すか」を固定する。
-- 判定は reviews への insert 時に trigger 経由で走るので、insert 後の値を確認する。
begin;
create extension if not exists pgtap;

select plan(17);

insert into brands (name) values ('信頼度テストブランドA'), ('信頼度テストブランドB');

insert into products (brand_id, name, category, price_yen, color_hex, ingredients)
select b.id, n.name, 'lip', 1500, '#B8604A', array['WATER']
from brands b
join (values
  ('信頼度テストブランドA', 'クリーン商品'),
  ('信頼度テストブランドA', 'テンプレ商品'),
  ('信頼度テストブランドA', 'バースト商品'),
  ('信頼度テストブランドA', '画像使い回し商品'),
  ('信頼度テストブランドB', '偏重商品1'),
  ('信頼度テストブランドB', '偏重商品2'),
  ('信頼度テストブランドB', '偏重商品3')
) as n(brand, name) on n.brand = b.name;

create temporary table pid as
select name, id from products where name in (
  'クリーン商品', 'テンプレ商品', 'バースト商品', '画像使い回し商品', '偏重商品1', '偏重商品2', '偏重商品3'
);

-- ---------------------------------------------------------------- 1. 何も引っかからない口コミ
insert into reviews (product_id, author_name, author_key, rating, body, posted_at)
values ((select id from pid where name = 'クリーン商品'), 'あ', 'clean-1', 4,
  '色は写真より少し落ち着いた印象で、乾燥は感じませんでした。', '2026-01-01T10:00:00Z');

select is((select trust_score from reviews where author_key = 'clean-1'), 1.0::numeric,
  '兆候が無ければ信頼度 1.0');
select is((select flags from reviews where author_key = 'clean-1'), '{}'::text[],
  '兆候が無ければフラグは空');
select is((select excluded from reviews where author_key = 'clean-1'), false,
  '信頼度 1.0 の口コミは集計に入る');

-- ---------------------------------------------------------------- 2. PR / 案件の定型表現
insert into reviews (product_id, author_name, author_key, rating, body, posted_at)
values ((select id from pid where name = 'クリーン商品'), 'い', 'pr-1', 5,
  'メーカー様より提供いただきました。とても良い商品です。', '2026-03-01T10:00:00Z');

select is((select flags from reviews where author_key = 'pr-1'), array['pr_boilerplate'],
  'PR・案件の定型表現に pr_boilerplate が付く');
select is((select trust_score from reviews where author_key = 'pr-1'), 0.8::numeric,
  'pr_boilerplate は 0.2 減点');
select is((select excluded from reviews where author_key = 'pr-1'), false,
  '0.5 以上なので集計には残る');

-- ---------------------------------------------------------------- 3. 同一文体クラスタ
insert into reviews (product_id, author_name, author_key, rating, body, posted_at)
values
  ((select id from pid where name = 'テンプレ商品'), 'う', 'tmpl-1', 4,
   'とても良い商品でした。リピートしたいと思います。友人にもすすめました。', '2026-01-05T10:00:00Z'),
  ((select id from pid where name = 'テンプレ商品'), 'え', 'tmpl-2', 4,
   'とても良い商品でした。リピートしたいと思います。友人にもすすめました。', '2026-02-05T10:00:00Z');

select is((select count(*) from reviews where author_key in ('tmpl-1', 'tmpl-2') and 'similar_text' = any(flags)),
  2::bigint, '文体が近い口コミは両方に similar_text が付く');
select is((select trust_score from reviews where author_key = 'tmpl-1'), 0.65::numeric,
  'similar_text は 0.35 減点');

-- ---------------------------------------------------------------- 4. 高評価バースト（24 時間以内に 3 件以上）
insert into reviews (product_id, author_name, author_key, rating, body, posted_at)
values
  ((select id from pid where name = 'バースト商品'), 'か', 'burst-1', 5,
   '発色が好みで、荒れることもなく満足しています。', '2026-01-10T09:00:00Z'),
  ((select id from pid where name = 'バースト商品'), 'き', 'burst-2', 5,
   '思っていたより軽いつけ心地で、時間が経っても気になりませんでした。', '2026-01-10T14:00:00Z'),
  ((select id from pid where name = 'バースト商品'), 'く', 'burst-3', 5,
   'マスクにも移りにくく、色の持ちがちょうどよかったです。', '2026-01-10T20:00:00Z');

select is((select count(*) from reviews where author_key like 'burst-%' and 'burst' = any(flags)),
  3::bigint, '24 時間以内の満点 3 件は全部 burst 扱い');
select is((select trust_score from reviews where author_key = 'burst-1'), 0.75::numeric,
  'burst は 0.25 減点');

insert into reviews (product_id, author_name, author_key, rating, body, posted_at)
values ((select id from pid where name = 'バースト商品'), 'け', 'burst-late', 5,
  'ケースの見た目も気に入っていて、持ち歩きやすい大きさです。', '2026-06-01T09:00:00Z');

select is((select flags from reviews where author_key = 'burst-late'), '{}'::text[],
  '日が離れた満点は burst にしない');

-- ---------------------------------------------------------------- 5. 画像の使い回し
insert into reviews (product_id, author_name, author_key, rating, body, image_phash, posted_at)
values
  ((select id from pid where name = '画像使い回し商品'), 'さ', 'img-1', 4,
   '手の甲で試した色に近く、想像どおりの仕上がりでした。', 'ffeeddccbbaa9988', '2026-01-20T09:00:00Z'),
  ((select id from pid where name = '画像使い回し商品'), 'し', 'img-2', 3,
   '塗り方によって色の出方が変わるので、量の調整が要ります。', 'ffeeddccbbaa9988', '2026-03-20T09:00:00Z');

select is((select count(*) from reviews where author_key in ('img-1', 'img-2') and 'image_reuse' = any(flags)),
  2::bigint, '同じ pHash の写真が複数あれば image_reuse');
select is((select trust_score from reviews where author_key = 'img-1'), 0.6::numeric,
  'image_reuse は 0.4 減点');

-- ---------------------------------------------------------------- 6. 同一ブランドへの偏重
insert into reviews (product_id, author_name, author_key, rating, body, posted_at)
values
  ((select id from pid where name = '偏重商品1'), 'た', 'bias-1', 5,
   'このブランドはどれも使いやすくて気に入っています。', '2026-01-01T09:00:00Z'),
  ((select id from pid where name = '偏重商品2'), 'た', 'bias-1', 5,
   '色展開が好みで、次の新色も買う予定です。', '2026-02-01T09:00:00Z'),
  ((select id from pid where name = '偏重商品3'), 'た', 'bias-1', 5,
   '容器がしっかりしていて、持ち運んでも安心でした。', '2026-03-01T09:00:00Z');

select is((select count(*) from reviews where author_key = 'bias-1' and 'brand_bias' = any(flags)),
  3::bigint, '同じ投稿者が同ブランドに満点を量産すると brand_bias');
select is((select min(trust_score) from reviews where author_key = 'bias-1'), 0.7::numeric,
  'brand_bias は 0.30 減点');

-- ---------------------------------------------------------------- 7. 除外の閾値と集計ビュー
insert into reviews (product_id, author_name, author_key, rating, body, image_phash, posted_at)
values
  ((select id from pid where name = 'テンプレ商品'), 'な', 'multi-1', 5,
   'とても良い商品でした。リピートしたいと思います。友人にもすすめました。', 'aabbccddeeff0011', '2026-04-01T09:00:00Z'),
  ((select id from pid where name = 'テンプレ商品'), 'に', 'multi-2', 5,
   'とても良い商品でした。リピートしたいと思います。友人にもすすめました。', 'aabbccddeeff0011', '2026-04-01T10:00:00Z');

select ok((select bool_and(excluded) from reviews where author_key in ('multi-1', 'multi-2')),
  '複数の兆候が重なって 0.5 を下回った口コミは集計から外す');

select ok(
  (select adjusted_rating < raw_rating from product_rating_summary
   where product_id = (select id from pid where name = 'テンプレ商品')),
  '除外があると補正後の評価は生の平均より低い');

select * from finish();
rollback;
