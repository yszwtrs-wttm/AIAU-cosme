/**
 * 店頭モードの判定。棚の前で一番知りたいのは「持ってる / 似てる / 持ってない」の 3 択だけなので、
 * 読み取ったバーコードからその 1 語に落とすところまでをここで済ませる。
 */

import { createClient } from "./supabase/client";
import type { DupeRow, Product } from "./types";

const PRODUCT_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

/** 手持ちと「似ている」と言い切る下限。商品ページの被り検出と同じ閾値。 */
const SIMILAR_MIN_SCORE = 0.5;

export type StoreVerdict = "owned" | "similar" | "new" | "unknown";

export type StoreJudgement = {
  /** 読み取ったバーコード。手入力もここに入る */
  code: string;
  verdict: StoreVerdict;
  product: Product | null;
  /** 似ている手持ち。score の高い順 */
  matches: DupeRow[];
};

export async function judgeByJan(code: string): Promise<StoreJudgement> {
  const supabase = createClient();

  const { data: product } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("jan", code)
    .maybeSingle<Product>();
  if (!product) return { code, verdict: "unknown", product: null, matches: [] };

  const [{ data: owned }, dupeRes] = await Promise.all([
    supabase.from("user_items").select("product_id").eq("product_id", product.id).maybeSingle(),
    supabase.rpc("find_duplicates_in_stash", {
      p_product_id: product.id,
      p_min_score: SIMILAR_MIN_SCORE,
    }),
  ]);

  const matches = (dupeRes.data ?? []) as DupeRow[];
  if (owned) return { code, verdict: "owned", product, matches };
  if (matches.length > 0) return { code, verdict: "similar", product, matches };
  return { code, verdict: "new", product, matches: [] };
}

export const VERDICT_LABEL: Record<StoreVerdict, string> = {
  owned: "持っています",
  similar: "似ています",
  new: "持っていません",
  unknown: "データにありません",
};

/** 手持ちとの価格差を言葉にする。row.price_diff は 手持ち − 候補。 */
export function priceGapText(row: DupeRow): string {
  const gap = -(row.price_diff ?? 0);
  if (gap === 0) return "手持ちと同じ値段";
  return gap > 0 ? `手持ちより ¥${gap.toLocaleString()} 高い` : `手持ちより ¥${(-gap).toLocaleString()} 安い`;
}
