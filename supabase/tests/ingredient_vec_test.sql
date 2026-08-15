-- 成分ベクトル（build_ingredient_vec）の pgTAP テスト。
-- 「配合順の重み付き multi-hot を L2 正規化する」という約束が崩れると、
-- cosine 類似度に基づく被り検出が静かに壊れるため、性質を固定する。
begin;
create extension if not exists pgtap;

select plan(12);

-- テスト用の成分マスタ。既存の dim とぶつからない範囲を使う。
insert into ingredients_master (dim, inci, name_ja) values
  (201, 'TEST INGREDIENT A', 'テストA'),
  (202, 'TEST INGREDIENT B', 'テストB'),
  (203, 'TEST INGREDIENT C', 'テストC');

select is(build_ingredient_vec(null), null, '成分表が null ならベクトルも null');

select is(
  build_ingredient_vec(array['NOT IN MASTER']) <-> build_ingredient_vec(array['ANOTHER UNKNOWN']),
  0::double precision,
  'マスタに無い成分だけならゼロベクトル（norm 0 でも 0 除算しない）');

-- L2 正規化: 自分自身との内積 = 1
select ok(
  abs((build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT B']) <#> build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT B'])) + 1) < 1e-5,
  'ベクトルは L2 正規化されている（自分との内積が 1）');

select ok(
  abs(build_ingredient_vec(array['TEST INGREDIENT A']) <=> build_ingredient_vec(array['TEST INGREDIENT A'])) < 1e-6,
  '同じ成分表の cosine 距離は 0');

select ok(
  abs((build_ingredient_vec(array['TEST INGREDIENT A']) <=> build_ingredient_vec(array['TEST INGREDIENT B'])) - 1) < 1e-6,
  '共通成分が無ければ cosine 距離は 1（類似度 0）');

-- 配合順の重み: w = 1 / log2(i + 2)。先頭ほど大きい。
select ok(
  (build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT B'])::real[])[201]
  > (build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT B'])::real[])[202],
  '先頭の成分ほど重みが大きい');

select ok(
  abs(
    (build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT B'])::real[])[201]
    / (build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT B'])::real[])[202]
    - (1 / log(2, 2::numeric))::double precision / (1 / log(2, 3::numeric))::double precision
  ) < 1e-3,
  '1 番目と 2 番目の重み比は log2(2) : log2(3) の逆比');

select ok(
  (build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT B'])
   <=> build_ingredient_vec(array['TEST INGREDIENT B', 'TEST INGREDIENT A'])) > 0,
  '並び順が違えば同じ成分でも同一ベクトルにはならない');

select ok(
  (build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT B'])
   <=> build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT C']))
  < (build_ingredient_vec(array['TEST INGREDIENT A', 'TEST INGREDIENT B'])
   <=> build_ingredient_vec(array['TEST INGREDIENT C'])),
  '共通成分が多いほど cosine 距離が小さい');

-- 表記ゆれ（大文字小文字・前後の空白）は同じ成分として扱う
select ok(
  abs(build_ingredient_vec(array['test ingredient a']) <=> build_ingredient_vec(array['TEST INGREDIENT A'])) < 1e-6,
  '成分名の大文字小文字は無視する');

select ok(
  abs(build_ingredient_vec(array['  TEST INGREDIENT A  ']) <=> build_ingredient_vec(array['TEST INGREDIENT A'])) < 1e-6,
  '成分名の前後の空白は無視する');

-- ---------------------------------------------------------------- trigger 経由
insert into brands (name) values ('テストブランド');
insert into products (brand_id, name, category, price_yen, color_hex, ingredients)
values (
  (select id from brands where name = 'テストブランド'),
  'テストリップ', 'lip', 1500, '#B8604A',
  array['TEST INGREDIENT A', 'TEST INGREDIENT B']
);

select ok(
  (select ingredient_vec is not null and color_lab is not null from products where name = 'テストリップ'),
  'products への insert で成分ベクトルと color_lab が自動で入る');

select * from finish();
rollback;
