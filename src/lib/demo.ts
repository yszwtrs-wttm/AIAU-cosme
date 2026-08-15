/**
 * ログインしなくても被り検出を試せる「サンプルポーチ」。
 *
 * 商品 id は環境によって変わりうるので、JAN で引く。
 * 読み取り専用のデモなので user_items には一切書かない。
 */

import { createClient } from "./supabase/server";
import type { PaletteCoverage, Product, StashOverlap } from "./types";

const PRODUCT_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

/** サンプルポーチの中身。同じ色・同じ処方の組み合わせが混ざるように選んでいる。 */
export const DEMO_STASH_JANS = [
  "4901234000018", // LUMINA グロウリップスティック 03 テラコッタ
  "4901234000025", // PRICO メルティリップ 03 テラコッタ
  "4901234000131", // LUMINA スキンフィットファンデーション 200 ナチュラルオークル
  "4901234000148", // PRICO カバーリキッド 200 ナチュラルオークル
  "4901234000353", // LUMINA デイリーアイパレット 01 ブラウンベージュ
] as const;

/** 「買おうか迷っている商品」として色カバレッジを見せる相手。 */
export const DEMO_TARGET_JAN = "4901234000360"; // PRICO 9色アイパレット 01 ブラウン

export type DemoPouch = {
  products: Product[];
  overlaps: StashOverlap[];
  target: Product | null;
  coverage: PaletteCoverage[];
};

export async function loadDemoPouch(): Promise<DemoPouch> {
  const supabase = await createClient();

  const [{ data: stash }, { data: target }] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).in("jan", [...DEMO_STASH_JANS]).returns<Product[]>(),
    supabase.from("products").select(PRODUCT_SELECT).eq("jan", DEMO_TARGET_JAN).maybeSingle<Product>(),
  ]);

  const order = new Map(DEMO_STASH_JANS.map((jan, i) => [jan as string, i]));
  const products = [...(stash ?? [])].sort(
    (a, b) => (order.get(a.jan ?? "") ?? 99) - (order.get(b.jan ?? "") ?? 99),
  );
  const ids = products.map((p) => p.id);

  if (ids.length === 0) return { products, overlaps: [], target: target ?? null, coverage: [] };

  const [overlapRes, coverageRes] = await Promise.all([
    supabase.rpc("find_overlaps_in_set", { p_product_ids: ids }),
    target
      ? supabase.rpc("find_palette_coverage_in_set", {
          p_product_id: target.id,
          p_product_ids: ids,
        })
      : Promise.resolve({ data: [] }),
  ]);

  return {
    products,
    overlaps: (overlapRes.data ?? []) as StashOverlap[],
    target: target ?? null,
    coverage: (coverageRes.data ?? []) as PaletteCoverage[],
  };
}
