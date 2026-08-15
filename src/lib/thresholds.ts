/**
 * 「似ている」の定義を置く唯一の場所。
 *
 * ΔE(CIEDE2000) と成分 cosine 類似度のしきい値は、表示文言（`wording.ts` / `color.ts`）と
 * SQL 側の既定値（`supabase/migrations/*_thresholds.sql`）の両方でここを参照する。
 * 数値は `thresholds.json` に置き、SQL は `npm run thresholds:sql` でそこから生成する。
 * 値を変えるときは JSON だけを直す。
 */

import raw from "./thresholds.json";

/** ΔE の区切り。各値はその段階の上限（未満）。 */
export const DELTA_E = raw.delta_e;

/** 色番号の間引きとパレット抽出。 */
export const SHADE = raw.shade;

/** パレットの手持ちカバー判定（SQL の `find_palette_coverage` と同じ値）。 */
export const PALETTE_COVERAGE = raw.palette_coverage;

/** 肌の色と色番号の近さ。 */
export const SKIN_TONE = raw.skin_tone;

/** 被りスコア（SQL の `dupe_score` と同じ値）。 */
export const DUPE_SCORE = raw.dupe_score;

/** 成分 cosine 類似度の区切り。各値はその段階の下限（以上）。 */
export const FORMULA_SIM = raw.formula_sim;

export const DELTA_E_TIERS = [
  "identical",
  "indistinguishable",
  "close",
  "noticeable",
  "far",
  "distant",
] as const;

/** ΔE の段階。表示文言はすべてこの段階をキーに引く。 */
export type DeltaETier = (typeof DELTA_E_TIERS)[number];

export function deltaETier(dE: number): DeltaETier {
  if (dE < DELTA_E.identical) return "identical";
  if (dE < DELTA_E.indistinguishable) return "indistinguishable";
  if (dE < DELTA_E.close) return "close";
  if (dE < DELTA_E.noticeable) return "noticeable";
  if (dE < DELTA_E.far) return "far";
  return "distant";
}

export const FORMULA_SIM_TIERS = ["same", "very_close", "close", "partial", "different"] as const;

/** 成分 cosine 類似度の段階。 */
export type FormulaSimTier = (typeof FORMULA_SIM_TIERS)[number];

export function formulaSimTier(sim: number): FormulaSimTier {
  if (sim >= FORMULA_SIM.same) return "same";
  if (sim >= FORMULA_SIM.very_close) return "very_close";
  if (sim >= FORMULA_SIM.close) return "close";
  if (sim >= FORMULA_SIM.partial) return "partial";
  return "different";
}
