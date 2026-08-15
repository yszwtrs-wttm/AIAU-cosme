-- パレットの被り（find_palette_coverage / products_min_delta_e）の pgTAP テスト。
-- 「10 色中 8 色は手持ちで再現できる」という数字の根拠になる部分なので、
-- 手持ちの色との対応付けと ΔE のしきい値を固定する。
begin;
create extension if not exists pgtap;

select plan(10);

insert into auth.users (id, instance_id, aud, role, email)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'palette-test@example.com');

insert into brands (name) values ('パレットテストブランド');

insert into products (brand_id, name, category, price_yen, ingredients)
select id, n.name, 'eyeshadow', 3000, array['MICA']
from brands, (values ('検討中パレット'), ('手持ちパレット')) as n(name)
where brands.name = 'パレットテストブランド';

create temporary table pid as
select name, id from products where name in ('検討中パレット', '手持ちパレット');

grant select on pid to authenticated;

-- 検討中の 3 色。うち 2 色は手持ちとほぼ同じ、1 色は手持ちに無い青。
insert into product_colors (product_id, pos, shade_name, hex) values
  ((select id from pid where name = '検討中パレット'), 1, '01 ベージュ', '#E3B892'),
  ((select id from pid where name = '検討中パレット'), 2, '02 ブラウン', '#8A5A3C'),
  ((select id from pid where name = '検討中パレット'), 3, '03 ブルー', '#2B5EA8');

-- 手持ちの色。01 はほぼ同じ、02 はわずかに違う。
insert into product_colors (product_id, pos, shade_name, hex) values
  ((select id from pid where name = '手持ちパレット'), 1, 'A ベージュ', '#E5BA94'),
  ((select id from pid where name = '手持ちパレット'), 2, 'B ブラウン', '#8C5C3E');

select ok((select lab is not null from product_colors where shade_name = '01 ベージュ'),
  'product_colors の insert で lab が自動計算される');

insert into user_items (user_id, product_id)
values ('11111111-1111-1111-1111-111111111111', (select id from pid where name = '手持ちパレット'));

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(auth.uid(), '11111111-1111-1111-1111-111111111111'::uuid, 'テスト用のユーザーとして実行している');

select is(
  (select count(*) from find_palette_coverage((select id from pid where name = '検討中パレット'))),
  3::bigint, 'パレットの色数と同じ行数が返る（手持ちが無い色も行は残る）');

select is(
  (select array_agg(pos order by pos) from find_palette_coverage((select id from pid where name = '検討中パレット'))),
  array[1, 2, 3], 'pos の昇順で返る');

select is(
  (select owned_shade from find_palette_coverage((select id from pid where name = '検討中パレット')) where pos = 1),
  'A ベージュ', '手持ちの中でいちばん近い色が対応付けられる');

select is(
  (select owned_shade from find_palette_coverage((select id from pid where name = '検討中パレット')) where pos = 2),
  'B ブラウン', '色ごとに別々の手持ち色が対応付けられる');

select is(
  (select owned_product_id from find_palette_coverage((select id from pid where name = '検討中パレット')) where pos = 3),
  null, '手持ちに近い色が無ければ（ΔE がしきい値超え）対応なし');

select ok(
  (select delta_e from find_palette_coverage((select id from pid where name = '検討中パレット')) where pos = 1) < 5,
  '対応付いた色の ΔE はしきい値未満');

select is(
  (select count(*) from find_palette_coverage((select id from pid where name = '検討中パレット'), 0.1)
   where owned_product_id is not null),
  0::bigint, 'しきい値を厳しくすると対応が外れる');

-- 2 商品の「いちばん近い色同士」の ΔE
select ok(
  products_min_delta_e((select id from pid where name = '検討中パレット'),
                       (select id from pid where name = '手持ちパレット')) < 5,
  'products_min_delta_e は一番近い色同士の ΔE を返す');

select * from finish();
rollback;
