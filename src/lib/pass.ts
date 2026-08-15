/**
 * 見送り記録の見せ方。
 *
 * アプリ内では ΔE や cosine を出さず `wording.ts` の日本語に置き換えているが、
 * シェア画像は説明文を読まれないまま流れていくので、数値そのものを載せる。
 * 画像と共有ページで同じ数字になるよう、ここに一本化する。
 */

import { PASS_REASON_LABEL, type PassReason, type SharedPass } from "./types";
import { colorMatchBadge, formulaMatchBadge } from "./wording";

export type PassStat = { label: string; value: string; unit?: string };

type PassLike = Pick<
  SharedPass,
  | "reason"
  | "price_yen"
  | "owned_label"
  | "ing_sim"
  | "delta_e"
  | "palette_total"
  | "palette_covered"
  | "alt_label"
  | "alt_price_yen"
>;

export function yen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

/** パレットの何%が手持ちと重複しているか。 */
export function coveragePercent(pass: PassLike): number | null {
  if (!pass.palette_total || pass.palette_covered === null) return null;
  return Math.round((pass.palette_covered / pass.palette_total) * 100);
}

/** 画像に載せる数値。縮小表示でも読めるよう 3 つまでに絞る。 */
export function passStats(pass: PassLike): PassStat[] {
  const stats: PassStat[] = [{ label: "買わずに済んだ", value: yen(pass.price_yen) }];
  const coverage = coveragePercent(pass);

  const candidates: PassStat[] = [];
  if (pass.ing_sim !== null) {
    candidates.push({
      label: "中身の一致",
      value: `${Math.round(pass.ing_sim * 100)}%`,
      unit: formulaMatchBadge(pass.ing_sim),
    });
  }
  if (pass.delta_e !== null) {
    candidates.push({
      label: "色差 ΔE",
      value: pass.delta_e.toFixed(1),
      unit: colorMatchBadge(pass.delta_e),
    });
  }
  if (coverage !== null) {
    candidates.push({
      label: "手持ちと重複した色",
      value: `${coverage}%`,
      unit: `${pass.palette_total}色中${pass.palette_covered}色`,
    });
  }
  if (pass.alt_price_yen !== null && pass.alt_price_yen < pass.price_yen) {
    candidates.push({
      label: "似ていて安い方との差",
      value: yen(pass.price_yen - pass.alt_price_yen),
    });
  }

  // 見送った理由に対応する数値を先に出す。
  const priority: Record<PassReason, string[]> = {
    dupe: ["中身の一致", "色差 ΔE"],
    palette: ["手持ちと重複した色", "色差 ΔE"],
    price: ["似ていて安い方との差", "中身の一致"],
    other: ["中身の一致", "手持ちと重複した色"],
  };
  const order = priority[pass.reason];
  candidates.sort((a, b) => {
    const ai = order.indexOf(a.label);
    const bi = order.indexOf(b.label);
    return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
  });

  return [...stats, ...candidates].slice(0, 3);
}

/** 画像と共有ページの見出し。 */
export function passHeadline(pass: PassLike): string {
  if (pass.reason === "dupe" && pass.owned_label) return "もう持っていたので、買いませんでした";
  if (pass.reason === "palette") return "手持ちで同じ色が作れたので、買いませんでした";
  if (pass.reason === "price") return "似ていて安い方があったので、買いませんでした";
  return "今回は買わずに済みました";
}

/** 根拠の一文。手持ちのどれと比べたのかを示す。 */
export function passEvidence(pass: PassLike): string {
  if (pass.owned_label) {
    const parts = [`手持ちの「${pass.owned_label}」と比較`];
    if (pass.ing_sim !== null) parts.push(formulaMatchBadge(pass.ing_sim));
    if (pass.delta_e !== null) parts.push(colorMatchBadge(pass.delta_e));
    return parts.join(" / ");
  }
  if (pass.alt_label) return `似ていて安い「${pass.alt_label}」と比較`;
  return PASS_REASON_LABEL[pass.reason];
}
