-- 画像の使い回し検出を average hash の完全一致から pHash(DCT) のハミング距離検索へ。
--
--   * ハッシュは 16 進 16 文字（64bit）で入ってくるので、比較用に bit(64) の生成列を持つ。
--   * 距離計算は SQL 側（phash_distance）。閾値以内なら「同じ写真の使い回し」とみなす。
--   * 既存行は average hash なので pHash と混ぜて比較できない。世代を phash_algo に記録し、
--     同じ世代同士だけ比較する（既存データの扱いは下の「移行」コメント参照）。

-- ---------------------------------------------------------------- ハッシュのユーティリティ
-- 16 進 16 文字だけを bit(64) に変換する。壊れた値・旧デモ値は null にして比較から外す。
create or replace function phash_hex_to_bits(p_hex text)
returns bit(64)
language sql
immutable
as $$
  select case
    when p_hex ~ '^[0-9a-fA-F]{16}$' then ('x' || lower(p_hex))::bit(64)
  end;
$$;

-- ハミング距離。xor したビット列の 1 の数。
create or replace function phash_distance(a bit(64), b bit(64))
returns int
language sql
immutable
as $$
  select length(replace((a # b)::text, '0', ''));
$$;

-- 使い回しと判定する距離。pHash は 64bit のうち 10bit 程度までは同一写真の
-- リサイズ / トリミング / 明度差で揺れるため 10。average hash は弱いので完全一致のみ。
create or replace function phash_reuse_threshold(p_algo text)
returns int
language sql
immutable
as $$
  select case when p_algo = 'phash_dct_v1' then 10 else 0 end;
$$;

-- ---------------------------------------------------------------- review_images
alter table review_images add column if not exists phash_algo text;

-- 既存行は average hash 実装で作られた値なので、その世代として残す。
update review_images set phash_algo = 'ahash_v1' where phash_algo is null and phash is not null;

alter table review_images alter column phash_algo set default 'phash_dct_v1';

do $$
begin
  alter table review_images
    add constraint review_images_phash_algo_check
    check (phash_algo is null or phash_algo in ('ahash_v1', 'phash_dct_v1'));
exception
  when duplicate_object then null;
end;
$$;

alter table review_images
  add column if not exists phash_bits bit(64)
  generated always as (phash_hex_to_bits(phash)) stored;

-- ---------------------------------------------------------------- reviews
alter table reviews add column if not exists image_phash_algo text;

update reviews set image_phash_algo = 'ahash_v1'
where image_phash_algo is null and image_phash is not null;

alter table reviews alter column image_phash_algo set default 'phash_dct_v1';

do $$
begin
  alter table reviews
    add constraint reviews_image_phash_algo_check
    check (image_phash_algo is null or image_phash_algo in ('ahash_v1', 'phash_dct_v1'));
exception
  when duplicate_object then null;
end;
$$;

alter table reviews
  add column if not exists image_phash_bits bit(64)
  generated always as (phash_hex_to_bits(image_phash)) stored;

-- 完全一致の絞り込み用。ハミング距離自体は順次走査（口コミ件数の規模では十分）。
create index if not exists reviews_image_phash_bits_idx on reviews (image_phash_bits);

-- ---------------------------------------------------------------- 判定ロジック
-- 変更点は image_reuse だけ。完全一致 → 同世代 + ハミング距離が閾値以内。
create or replace function recompute_review_trust(p_product_id bigint)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  with base as (
    select r.id, r.body, r.rating, r.posted_at, r.author_key,
           r.image_phash_bits, r.image_phash_algo, p.brand_id
    from reviews r
    join products p on p.id = r.product_id
    where r.product_id = p_product_id
  ),
  -- 1. 同一商品内で文体が近い口コミ同士（テンプレ投稿クラスタ）
  similar_text as (
    select distinct a.id
    from base a
    join base b on b.id <> a.id and similarity(a.body, b.body) > 0.45
  ),
  -- 2. 投稿バースト（24時間以内に高評価が3件以上）
  burst as (
    select distinct a.id
    from base a
    where a.rating >= 5
      and (
        select count(*) from base b
        where b.rating >= 5 and abs(extract(epoch from (b.posted_at - a.posted_at))) < 86400
      ) >= 3
  ),
  -- 3. 同一ブランドへの偏重（同じ投稿者が同ブランドに満点を量産）
  brand_bias as (
    select distinct a.id
    from base a
    where (
      select count(*)
      from reviews r2
      join products p2 on p2.id = r2.product_id
      where r2.author_key = a.author_key and p2.brand_id = a.brand_id and r2.rating >= 5
    ) >= 3
  ),
  -- 4. PR / 案件の定型表現
  boilerplate as (
    select id from base
    where body ~ '(PR|ＰＲ|提供|案件|モニター|ステマ|タイアップ|プレゼント企画|#pr)'
  ),
  -- 5. 画像の使い回し（pHash が近い写真が別の口コミにも出ている）
  image_reuse as (
    select distinct a.id
    from base a
    where a.image_phash_bits is not null
      and exists (
        select 1
        from reviews r3
        where r3.id <> a.id
          and r3.image_phash_bits is not null
          and r3.image_phash_algo is not distinct from a.image_phash_algo
          and phash_distance(r3.image_phash_bits, a.image_phash_bits)
              <= phash_reuse_threshold(a.image_phash_algo)
      )
  ),
  scored as (
    select
      b.id,
      array_remove(array[
        case when st.id is not null then 'similar_text' end,
        case when bu.id is not null then 'burst' end,
        case when bb.id is not null then 'brand_bias' end,
        case when bp.id is not null then 'pr_boilerplate' end,
        case when ir.id is not null then 'image_reuse' end
      ], null) as flags
    from base b
    left join similar_text st on st.id = b.id
    left join burst bu on bu.id = b.id
    left join brand_bias bb on bb.id = b.id
    left join boilerplate bp on bp.id = b.id
    left join image_reuse ir on ir.id = b.id
  ),
  final as (
    select
      id,
      flags,
      greatest(0, 1
        - (case when 'similar_text'  = any(flags) then 0.35 else 0 end)
        - (case when 'burst'         = any(flags) then 0.25 else 0 end)
        - (case when 'brand_bias'    = any(flags) then 0.30 else 0 end)
        - (case when 'pr_boilerplate'= any(flags) then 0.20 else 0 end)
        - (case when 'image_reuse'   = any(flags) then 0.40 else 0 end)
      )::numeric as trust
    from scored
  )
  update reviews r
  set flags = f.flags,
      trust_score = f.trust,
      excluded = f.trust < 0.5
  from final f
  where r.id = f.id
    and (r.flags is distinct from f.flags
         or r.trust_score is distinct from f.trust
         or r.excluded is distinct from (f.trust < 0.5));
end;
$$;

-- 写真の 1 枚目のハッシュを reviews 側に書き戻す（世代も一緒に運ぶ）。
create or replace function trg_review_images_sync_phash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product bigint;
begin
  if new.pos = 0 and new.phash is not null then
    update reviews
    set image_phash = new.phash,
        image_phash_algo = coalesce(new.phash_algo, 'phash_dct_v1')
    where id = new.review_id;
    select product_id into v_product from reviews where id = new.review_id;
    if v_product is not null then
      perform recompute_review_trust(v_product);
    end if;
  end if;
  return new;
end;
$$;

-- 再計算スクリプトで写真のハッシュを差し替えたときも reviews 側に反映させる。
drop trigger if exists review_images_sync_phash on review_images;
create trigger review_images_sync_phash
after insert or update of phash, phash_algo on review_images
for each row execute function trg_review_images_sync_phash();

-- 世代の付け替えでも再判定が走るようにする。
drop trigger if exists reviews_recompute on reviews;
create trigger reviews_recompute
after insert or update of body, rating, image_phash, image_phash_algo, posted_at on reviews
for each row execute function trg_reviews_recompute();

-- ---------------------------------------------------------------- 既存データの移行
-- 1. このマイグレーションで既存の phash / image_phash は 'ahash_v1' として保存され、
--    従来どおり完全一致だけで使い回しと判定される（判定結果は変わらない）。
-- 2. 新しい投稿はクライアントが pHash(DCT) を計算し 'phash_dct_v1' で入る。
-- 3. 既存画像を pHash に揃えたい場合は Storage の画像から再計算する
--    `python3 scripts/rehash_review_images.py`（--apply で書き込み）を流す。
--    ハッシュが更新されると trigger 経由で信頼度が再計算される。
-- 4. 判定結果を作り直したい場合は次を実行する。
--      select recompute_review_trust(id) from products;
