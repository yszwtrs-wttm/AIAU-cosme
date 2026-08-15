/**
 * src/lib/types.ts のカテゴリ定義（唯一の正）と、supabase/migrations の
 * products_category_check の許可値が一致しているかを確認する。
 *
 *   node scripts/check-categories.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadCategories() {
  const source = readFileSync(path.join(root, "src/lib/types.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  const { CATEGORIES } = await import(url);
  return CATEGORIES;
}

/** マイグレーションを名前順に読み、最後に定義された check 制約の許可値を返す */
function constraintCategories() {
  const dir = path.join(root, "supabase/migrations");
  let last = null;
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(path.join(dir, file), "utf8");
    for (const match of sql.matchAll(/check\s*\(\s*category\s+in\s*\(([^)]*)\)\s*\)/gi)) {
      last = {
        file,
        values: [...match[1].matchAll(/'([^']+)'/g)].map((value) => value[1]),
      };
    }
  }
  return last;
}

const categories = await loadCategories();
const constraint = constraintCategories();

if (!constraint) {
  console.error("products_category_check の定義が supabase/migrations に見つからない");
  process.exit(1);
}

const missing = categories.filter((category) => !constraint.values.includes(category));
const extra = constraint.values.filter((value) => !categories.includes(value));

if (missing.length > 0 || extra.length > 0) {
  console.error(`カテゴリ定義と DB 制約（${constraint.file}）が一致しない`);
  if (missing.length > 0) console.error(`  制約に無い: ${missing.join(", ")}`);
  if (extra.length > 0) console.error(`  定義に無い: ${extra.join(", ")}`);
  console.error("src/lib/types.ts の CATEGORY_DEFS を直すか、制約を更新するマイグレーションを追加する");
  process.exit(1);
}

console.log(`カテゴリ ${categories.length} 件が ${constraint.file} の制約と一致`);
