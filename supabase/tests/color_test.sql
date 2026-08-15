-- 色差ロジック（hex_to_lab / lab_delta_e / dupe_score）の pgTAP テスト。
-- 実行: npm run test:db（supabase start 済みのローカル DB に対して走る）
begin;
create extension if not exists pgtap;

select plan(53);

-- ---------------------------------------------------------------- hex_to_lab
select ok(abs((hex_to_lab('#ffffff'))[1] - 100) < 0.01, '白は L* = 100');
select ok(abs((hex_to_lab('#ffffff'))[2]) < 0.01 and abs((hex_to_lab('#ffffff'))[3]) < 0.01, '白は無彩色 (a*, b* = 0)');
select ok(abs((hex_to_lab('#000000'))[1]) < 0.01, '黒は L* = 0');
select is(hex_to_lab('#fff'), null, '桁数が足りない HEX は null');
select ok((hex_to_lab('#808080'))[1] between 53.5 and 53.7, 'sRGB 50% グレーは L* ≒ 53.6');
select is(hex_to_lab('#b8604a'), hex_to_lab('B8604A'), '# の有無で結果は変わらない');

-- ---------------------------------------------------------------- lab_delta_e の基本性質
select is(lab_delta_e(array[50, 20, 10]::double precision[], array[50, 20, 10]::double precision[]), 0::double precision,
  '同じ色の ΔE は 0');
select is(
  lab_delta_e(array[50, 20, 10]::double precision[], array[55, 12, 4]::double precision[]),
  lab_delta_e(array[55, 12, 4]::double precision[], array[50, 20, 10]::double precision[]),
  'ΔE は対称');
select is(lab_delta_e(null, array[50, 20, 10]::double precision[]), null, '片方が null なら null');
select is(lab_delta_e(array[50, 20]::double precision[], array[50, 20, 10]::double precision[]), null,
  '3 要素でない配列は null');

-- ---------------------------------------------------------------- CIEDE2000 公開テストデータ
-- 出典: Sharma, Wu, Dalal (2005) "The CIEDE2000 Color-Difference Formula" Table 1
-- https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/dataNprograms/ciede2000testdata.txt
select ok(abs(lab_delta_e(array[50.0000, 2.6772, -79.7751]::double precision[], array[50.0000, 0.0000, -82.7485]::double precision[]) - 2.0425) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.6772, -79.7751) vs (50.0000, 0.0000, -82.7485) = 2.0425');
select ok(abs(lab_delta_e(array[50.0000, 3.1571, -77.2803]::double precision[], array[50.0000, 0.0000, -82.7485]::double precision[]) - 2.8615) < 0.0001,
  'CIEDE2000 test data: (50.0000, 3.1571, -77.2803) vs (50.0000, 0.0000, -82.7485) = 2.8615');
select ok(abs(lab_delta_e(array[50.0000, 2.8361, -74.0200]::double precision[], array[50.0000, 0.0000, -82.7485]::double precision[]) - 3.4412) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.8361, -74.0200) vs (50.0000, 0.0000, -82.7485) = 3.4412');
select ok(abs(lab_delta_e(array[50.0000, -1.3802, -84.2814]::double precision[], array[50.0000, 0.0000, -82.7485]::double precision[]) - 1.0000) < 0.0001,
  'CIEDE2000 test data: (50.0000, -1.3802, -84.2814) vs (50.0000, 0.0000, -82.7485) = 1.0000');
select ok(abs(lab_delta_e(array[50.0000, -1.1848, -84.8006]::double precision[], array[50.0000, 0.0000, -82.7485]::double precision[]) - 1.0000) < 0.0001,
  'CIEDE2000 test data: (50.0000, -1.1848, -84.8006) vs (50.0000, 0.0000, -82.7485) = 1.0000');
select ok(abs(lab_delta_e(array[50.0000, -0.9009, -85.5211]::double precision[], array[50.0000, 0.0000, -82.7485]::double precision[]) - 1.0000) < 0.0001,
  'CIEDE2000 test data: (50.0000, -0.9009, -85.5211) vs (50.0000, 0.0000, -82.7485) = 1.0000');
select ok(abs(lab_delta_e(array[50.0000, 0.0000, 0.0000]::double precision[], array[50.0000, -1.0000, 2.0000]::double precision[]) - 2.3669) < 0.0001,
  'CIEDE2000 test data: (50.0000, 0.0000, 0.0000) vs (50.0000, -1.0000, 2.0000) = 2.3669');
select ok(abs(lab_delta_e(array[50.0000, -1.0000, 2.0000]::double precision[], array[50.0000, 0.0000, 0.0000]::double precision[]) - 2.3669) < 0.0001,
  'CIEDE2000 test data: (50.0000, -1.0000, 2.0000) vs (50.0000, 0.0000, 0.0000) = 2.3669');
select ok(abs(lab_delta_e(array[50.0000, 2.4900, -0.0010]::double precision[], array[50.0000, -2.4900, 0.0009]::double precision[]) - 7.1792) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.4900, -0.0010) vs (50.0000, -2.4900, 0.0009) = 7.1792');
select ok(abs(lab_delta_e(array[50.0000, 2.4900, -0.0010]::double precision[], array[50.0000, -2.4900, 0.0010]::double precision[]) - 7.1792) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.4900, -0.0010) vs (50.0000, -2.4900, 0.0010) = 7.1792');
select ok(abs(lab_delta_e(array[50.0000, 2.4900, -0.0010]::double precision[], array[50.0000, -2.4900, 0.0011]::double precision[]) - 7.2195) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.4900, -0.0010) vs (50.0000, -2.4900, 0.0011) = 7.2195');
select ok(abs(lab_delta_e(array[50.0000, 2.4900, -0.0010]::double precision[], array[50.0000, -2.4900, 0.0012]::double precision[]) - 7.2195) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.4900, -0.0010) vs (50.0000, -2.4900, 0.0012) = 7.2195');
select ok(abs(lab_delta_e(array[50.0000, -0.0010, 2.4900]::double precision[], array[50.0000, 0.0009, -2.4900]::double precision[]) - 4.8045) < 0.0001,
  'CIEDE2000 test data: (50.0000, -0.0010, 2.4900) vs (50.0000, 0.0009, -2.4900) = 4.8045');
select ok(abs(lab_delta_e(array[50.0000, -0.0010, 2.4900]::double precision[], array[50.0000, 0.0010, -2.4900]::double precision[]) - 4.8045) < 0.0001,
  'CIEDE2000 test data: (50.0000, -0.0010, 2.4900) vs (50.0000, 0.0010, -2.4900) = 4.8045');
select ok(abs(lab_delta_e(array[50.0000, -0.0010, 2.4900]::double precision[], array[50.0000, 0.0011, -2.4900]::double precision[]) - 4.7461) < 0.0001,
  'CIEDE2000 test data: (50.0000, -0.0010, 2.4900) vs (50.0000, 0.0011, -2.4900) = 4.7461');
select ok(abs(lab_delta_e(array[50.0000, 2.5000, 0.0000]::double precision[], array[50.0000, 0.0000, -2.5000]::double precision[]) - 4.3065) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.5000, 0.0000) vs (50.0000, 0.0000, -2.5000) = 4.3065');
select ok(abs(lab_delta_e(array[50.0000, 2.5000, 0.0000]::double precision[], array[73.0000, 25.0000, -18.0000]::double precision[]) - 27.1492) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.5000, 0.0000) vs (73.0000, 25.0000, -18.0000) = 27.1492');
select ok(abs(lab_delta_e(array[50.0000, 2.5000, 0.0000]::double precision[], array[61.0000, -5.0000, 29.0000]::double precision[]) - 22.8977) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.5000, 0.0000) vs (61.0000, -5.0000, 29.0000) = 22.8977');
select ok(abs(lab_delta_e(array[50.0000, 2.5000, 0.0000]::double precision[], array[56.0000, -27.0000, -3.0000]::double precision[]) - 31.9030) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.5000, 0.0000) vs (56.0000, -27.0000, -3.0000) = 31.9030');
select ok(abs(lab_delta_e(array[50.0000, 2.5000, 0.0000]::double precision[], array[58.0000, 24.0000, 15.0000]::double precision[]) - 19.4535) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.5000, 0.0000) vs (58.0000, 24.0000, 15.0000) = 19.4535');
select ok(abs(lab_delta_e(array[50.0000, 2.5000, 0.0000]::double precision[], array[50.0000, 3.1736, 0.5854]::double precision[]) - 1.0000) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.5000, 0.0000) vs (50.0000, 3.1736, 0.5854) = 1.0000');
select ok(abs(lab_delta_e(array[50.0000, 2.5000, 0.0000]::double precision[], array[50.0000, 3.2972, 0.0000]::double precision[]) - 1.0000) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.5000, 0.0000) vs (50.0000, 3.2972, 0.0000) = 1.0000');
select ok(abs(lab_delta_e(array[50.0000, 2.5000, 0.0000]::double precision[], array[50.0000, 1.8634, 0.5757]::double precision[]) - 1.0000) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.5000, 0.0000) vs (50.0000, 1.8634, 0.5757) = 1.0000');
select ok(abs(lab_delta_e(array[50.0000, 2.5000, 0.0000]::double precision[], array[50.0000, 3.2592, 0.3350]::double precision[]) - 1.0000) < 0.0001,
  'CIEDE2000 test data: (50.0000, 2.5000, 0.0000) vs (50.0000, 3.2592, 0.3350) = 1.0000');
select ok(abs(lab_delta_e(array[60.2574, -34.0099, 36.2677]::double precision[], array[60.4626, -34.1751, 39.4387]::double precision[]) - 1.2644) < 0.0001,
  'CIEDE2000 test data: (60.2574, -34.0099, 36.2677) vs (60.4626, -34.1751, 39.4387) = 1.2644');
select ok(abs(lab_delta_e(array[63.0109, -31.0961, -5.8663]::double precision[], array[62.8187, -29.7946, -4.0864]::double precision[]) - 1.2630) < 0.0001,
  'CIEDE2000 test data: (63.0109, -31.0961, -5.8663) vs (62.8187, -29.7946, -4.0864) = 1.2630');
select ok(abs(lab_delta_e(array[61.2901, 3.7196, -5.3901]::double precision[], array[61.4292, 2.2480, -4.9620]::double precision[]) - 1.8731) < 0.0001,
  'CIEDE2000 test data: (61.2901, 3.7196, -5.3901) vs (61.4292, 2.2480, -4.9620) = 1.8731');
select ok(abs(lab_delta_e(array[35.0831, -44.1164, 3.7933]::double precision[], array[35.0232, -40.0716, 1.5901]::double precision[]) - 1.8645) < 0.0001,
  'CIEDE2000 test data: (35.0831, -44.1164, 3.7933) vs (35.0232, -40.0716, 1.5901) = 1.8645');
select ok(abs(lab_delta_e(array[22.7233, 20.0904, -46.6940]::double precision[], array[23.0331, 14.9730, -42.5619]::double precision[]) - 2.0373) < 0.0001,
  'CIEDE2000 test data: (22.7233, 20.0904, -46.6940) vs (23.0331, 14.9730, -42.5619) = 2.0373');
select ok(abs(lab_delta_e(array[36.4612, 47.8580, 18.3852]::double precision[], array[36.2715, 50.5065, 21.2231]::double precision[]) - 1.4146) < 0.0001,
  'CIEDE2000 test data: (36.4612, 47.8580, 18.3852) vs (36.2715, 50.5065, 21.2231) = 1.4146');
select ok(abs(lab_delta_e(array[90.8027, -2.0831, 1.4410]::double precision[], array[91.1528, -1.6435, 0.0447]::double precision[]) - 1.4441) < 0.0001,
  'CIEDE2000 test data: (90.8027, -2.0831, 1.4410) vs (91.1528, -1.6435, 0.0447) = 1.4441');
select ok(abs(lab_delta_e(array[90.9257, -0.5406, -0.9208]::double precision[], array[88.6381, -0.8985, -0.7239]::double precision[]) - 1.5381) < 0.0001,
  'CIEDE2000 test data: (90.9257, -0.5406, -0.9208) vs (88.6381, -0.8985, -0.7239) = 1.5381');
select ok(abs(lab_delta_e(array[6.7747, -0.2908, -2.4247]::double precision[], array[5.8714, -0.0985, -2.2286]::double precision[]) - 0.6377) < 0.0001,
  'CIEDE2000 test data: (6.7747, -0.2908, -2.4247) vs (5.8714, -0.0985, -2.2286) = 0.6377');
select ok(abs(lab_delta_e(array[2.0776, 0.0795, -1.1350]::double precision[], array[0.9033, -0.0636, -0.5514]::double precision[]) - 0.9082) < 0.0001,
  'CIEDE2000 test data: (2.0776, 0.0795, -1.1350) vs (0.9033, -0.0636, -0.5514) = 0.9082');
-- ---------------------------------------------------------------- dupe_score
select is(dupe_score(1, 0), 1::double precision, '成分も色も同一なら 1');
select is(dupe_score(0, 20), 0::double precision, '成分も色も違えば 0');
select is(dupe_score(0.9, null), 0.9::double precision, '色が無い商品は成分類似度そのまま');
select is(dupe_score(1.5, null), 1::double precision, '成分類似度が 1 を超えても 1 で止まる');
select is(dupe_score(-0.5, null), 0::double precision, '成分類似度が負でも 0 で止まる');
select is(dupe_score(1, 5), 0.8::double precision, 'ΔE 5・成分同一なら 0.6 + 0.4 * 0.5');
select ok(dupe_score(0.8, 2) > dupe_score(0.8, 8), '成分が同じなら色が近いほうが高い');
select ok(dupe_score(0.9, 4) > dupe_score(0.5, 4), '色が同じなら成分が近いほうが高い');
select is(dupe_score(0.5, 10), dupe_score(0.5, 30), 'ΔE 10 以上は下限で頭打ち');

select * from finish();
rollback;
