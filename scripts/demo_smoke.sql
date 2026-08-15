-- デモ導線のスモークテスト。
--   npm run db:reset && npm run smoke:demo
-- 「決まった URL を開けば必ず被り・安い代替・色カバレッジ・サクラ除外が出る」ことだけを確かめる。
-- 1つでも空振りしたら exception で落ちるので、CI で気付ける。

\set ON_ERROR_STOP on

do $$
declare
  demo_user   uuid := 'd0000000-0000-4000-8000-000000000001';
  dupe_target bigint;    -- /products/<id> で「もう持っています」が出る商品
  cheaper_target bigint; -- /products/<id> で「こっちが安い」が出る商品
  coverage_target bigint;-- /products/<id> で色カバレッジが出るパレット
  sakura_target bigint;  -- /products/<id> でサクラが除外される商品
  v_count int;
  v_savings int;
  v_score double precision;
begin
  -- 前提: デモ用アカウントとポーチ5点
  if not exists (select 1 from auth.users where id = demo_user and email = 'demo@kawanai.test') then
    raise exception 'デモ用アカウントが無い。npm run db:reset を実行したか確認する';
  end if;
  if not exists (select 1 from profiles where user_id = demo_user) then
    raise exception 'デモ用アカウントのプロフィールが無い';
  end if;
  select count(*) into v_count from user_items where user_id = demo_user;
  if v_count <> 5 then
    raise exception 'デモ用ポーチが5点でない (実際: %)', v_count;
  end if;

  select p.id into dupe_target from products p join brands b on b.id = p.brand_id
    where b.name = 'PRICO' and p.name like 'メルティリップ%';
  select p.id into cheaper_target from products p join brands b on b.id = p.brand_id
    where b.name = 'LUMINA' and p.name like 'スキンフィットファンデーション%';
  select p.id into coverage_target from products p join brands b on b.id = p.brand_id
    where b.name = 'PRICO' and p.name like '9色アイパレット%';
  select p.id into sakura_target from products p join brands b on b.id = p.brand_id
    where b.name = 'mode noir' and p.name like 'セラムファンデーション%';
  if dupe_target is null or cheaper_target is null or coverage_target is null or sakura_target is null then
    raise exception 'デモで使う商品がシードに無い';
  end if;

  -- デモ用アカウントとして関数を呼ぶ（auth.uid() を使う関数があるため）
  perform set_config('request.jwt.claims',
    json_build_object('sub', demo_user, 'role', 'authenticated')::text, true);

  -- 1. 被り: ポーチの中に「ほぼ同じ色・同じ処方」がある
  select count(*), max(score) into v_count, v_score
  from find_duplicates_in_stash(dupe_target);
  if v_count = 0 then
    raise exception '被りが出ない: /products/%', dupe_target;
  end if;
  if v_score < 0.85 then
    raise exception '被りのスコアが弱い (%): /products/%', v_score, dupe_target;
  end if;

  -- 2. ポーチ内の被り（/stash）
  if not exists (select 1 from find_stash_overlaps()) then
    raise exception 'ポーチ内の被りが出ない: /stash';
  end if;

  -- 3. 安い代替: 同処方でしっかり安いものが出る
  select count(*), max(savings) into v_count, v_savings
  from find_cheaper_dupes(cheaper_target)
  where score >= 0.85;
  if v_count = 0 then
    raise exception '安い代替が出ない: /products/%', cheaper_target;
  end if;
  if v_savings < 3000 then
    raise exception '安い代替の価格差が小さい (¥%): /products/%', v_savings, cheaper_target;
  end if;

  -- 4. 色カバレッジ: パレットの全色が手持ちで再現できる
  select count(*) into v_count
  from find_palette_coverage(coverage_target)
  where owned_product_id is null;
  if v_count > 0 then
    raise exception '色カバレッジに穴がある (% 色): /products/%', v_count, coverage_target;
  end if;

  -- 5. サクラ除外: 除外された口コミがあり、残った口コミもある
  select count(*) filter (where excluded), count(*) filter (where not excluded)
  into v_count, v_savings
  from reviews where product_id = sakura_target;
  if v_count = 0 then
    raise exception 'サクラが除外されていない: /products/%', sakura_target;
  end if;
  if v_savings = 0 then
    raise exception '全部の口コミが除外されている: /products/%', sakura_target;
  end if;

  raise notice 'デモ導線 OK: 被り /products/% / 安い代替 /products/% / 色カバレッジ /products/% / サクラ /products/%',
    dupe_target, cheaper_target, coverage_target, sakura_target;
end;
$$;
