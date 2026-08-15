/**
 * src/lib/thresholds.json から SQL 側のしきい値を生成する。
 *
 *   node scripts/generate_thresholds_sql.mjs          # マイグレーションを書き出す
 *   node scripts/generate_thresholds_sql.mjs --check  # 生成物が JSON と一致するか確認する
 *
 * TS 側（wording / color）と SQL 側（dupe_score / find_palette_coverage）が同じ数値を
 * 見るようにするための一方向生成。SQL は threshold('delta_e.close') のように参照する。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = join(root, "src/lib/thresholds.json");
const sqlPath = join(root, "supabase/migrations/20260819000100_thresholds.sql");

function flatten(thresholds) {
  return Object.entries(thresholds).flatMap(([section, values]) =>
    Object.entries(values).map(([key, value]) => [`${section}.${key}`, value]),
  );
}

export function buildSql(thresholds) {
  const cases = flatten(thresholds)
    .map(([key, value]) => `    when '${key}' then ${value}::double precision`)
    .join("\n");

  return `-- 自動生成: node scripts/generate_thresholds_sql.mjs（src/lib/thresholds.json が原本）
-- 手で編集しないこと。しきい値を変えるときは JSON を直して生成し直す。
-- すべて create or replace なので、再生成したものを新しいタイムスタンプで置いても問題ない。

-- ---------------------------------------------------------------- しきい値の参照
create or replace function threshold(p_key text)
returns double precision
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v double precision;
begin
  v := case p_key
${cases}
  end;
  if v is null then
    raise exception 'unknown threshold key: %', p_key;
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------- 総合スコア
-- 成分 cosine 類似度と色差から「実質同じか」の 0-1 スコアを作る。重みと ΔE の上限は JSON 側。
create or replace function dupe_score(ing_sim double precision, delta_e double precision)
returns double precision
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when delta_e is null then greatest(0, least(1, ing_sim))
    else greatest(0, least(1,
      threshold('dupe_score.ingredient_weight') * ing_sim
      + threshold('dupe_score.color_weight')
        * greatest(0, 1 - delta_e / threshold('dupe_score.delta_e_zero'))
    ))
  end;
$$;

-- ---------------------------------------------------------------- パレットの手持ちカバー
-- p_max_delta を省略したときの「似ている」の定義を JSON 側と揃える。
create or replace function find_palette_coverage(p_product_id bigint, p_max_delta double precision default null)
returns table (
  pos int,
  shade_name text,
  shade_hex text,
  owned_product_id bigint,
  owned_label text,
  owned_shade text,
  owned_hex text,
  delta_e double precision
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with mine as (
    select pc.product_id, pc.shade_name, pc.hex, pc.lab, br.name || ' ' || p.name as label
    from user_items ui
    join products p on p.id = ui.product_id
    join brands br on br.id = p.brand_id
    join product_colors pc on pc.product_id = p.id
    where ui.user_id = auth.uid()
      and p.id <> p_product_id
  )
  select
    target.pos,
    target.shade_name,
    target.hex,
    nearest.product_id,
    nearest.label,
    nearest.shade_name,
    nearest.hex,
    nearest.delta_e
  from product_colors target
  left join lateral (
    select m.product_id, m.label, m.shade_name, m.hex, lab_delta_e(m.lab, target.lab) as delta_e
    from mine m
    order by lab_delta_e(m.lab, target.lab) asc
    limit 1
  ) nearest on nearest.delta_e <= coalesce(p_max_delta, threshold('palette_coverage.max_delta_e'))
  where target.product_id = p_product_id
  order by target.pos;
$$;
`;
}

function main() {
  const sql = buildSql(JSON.parse(readFileSync(jsonPath, "utf8")));

  if (process.argv.includes("--check")) {
    if (readFileSync(sqlPath, "utf8") !== sql) {
      console.error(
        `${sqlPath} が src/lib/thresholds.json と一致していません。node scripts/generate_thresholds_sql.mjs を実行してください。`,
      );
      process.exit(1);
    }
    console.log("thresholds SQL は最新です。");
    return;
  }

  writeFileSync(sqlPath, sql);
  console.log(`wrote ${sqlPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
