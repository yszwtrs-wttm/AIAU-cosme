/**
 * 開発者向けの数値を、ユーザーが読める日本語に変換する層。
 *
 * ΔE・cosine 類似度・信頼度スコアは判定には使うが、画面には出さない。
 * 出すのは「見分けがつきません」「中身はほぼ同じです」といった言葉と、色の見本。
 */

import { deltaE, hexToLab } from "./color";

export const REVIEW_FLAG_LABEL: Record<string, string> = {
  image_reuse: "他の投稿と同じ写真",
  similar_text: "似た文章の連投",
  burst: "短時間に集中した高評価",
  brand_bias: "同じブランドへの満点連投",
  pr_boilerplate: "PR・案件の定型文",
};

/** 色の近さ。ΔE(CIEDE2000) を言葉に置き換える。 */
export function colorMatchText(dE: number): { title: string; tone: "same" | "close" | "near" | "diff" } {
  if (dE < 1) return { title: "見分けがつきません", tone: "same" };
  if (dE < 2) return { title: "並べても違いは分かりにくい色です", tone: "same" };
  if (dE < 5) return { title: "かなり近い色です（塗ればほぼ同じ）", tone: "close" };
  if (dE < 10) return { title: "少し違う色です", tone: "near" };
  return { title: "別の色です", tone: "diff" };
}

/** 短いバッジ用。 */
export function colorMatchBadge(dE: number): string {
  if (dE < 2) return "ほぼ同じ色";
  if (dE < 5) return "かなり近い";
  if (dE < 10) return "少し違う";
  return "別の色";
}

/**
 * 写真から探すときのバッジ。撮影した色は照明やカメラでずれるため、
 * ここでは「別の色」と言い切らず、近い順に並んでいることが伝わる言葉にする。
 */
export function colorSearchBadge(dE: number): string {
  if (dE < 2) return "ほぼ同じ色";
  if (dE < 5) return "かなり近い";
  if (dE < 10) return "少し違う";
  if (dE < 20) return "やや離れた色";
  return "写真の色とは離れた色";
}

/**
 * 「どう違うのか」を方向で説明する。数値より親切なのはこれ。
 * base から target への差を、明るさ・赤み/青み・黄み の言葉にする。
 */
export function colorDifferenceText(baseHex: string, targetHex: string): string {
  const a = hexToLab(baseHex);
  const b = hexToLab(targetHex);
  const dL = b.l - a.l;
  const dA = b.a - a.a;
  const dB = b.b - a.b;
  const parts: string[] = [];

  const level = (v: number) => (Math.abs(v) > 8 ? "かなり" : Math.abs(v) > 3 ? "少し" : "わずかに");

  if (Math.abs(dL) > 1.5) parts.push(`${level(dL)}${dL > 0 ? "明るい" : "暗い"}`);
  if (Math.abs(dA) > 1.5) parts.push(`${level(dA)}${dA > 0 ? "赤みが強い" : "赤みが弱い"}`);
  if (Math.abs(dB) > 1.5) parts.push(`${level(dB)}${dB > 0 ? "黄みが強い" : "青みが強い"}`);

  if (parts.length === 0) return "ほとんど同じ色みです";
  return `${parts.join("・")}色です`;
}

/** 処方の近さ。cosine 類似度を言葉に置き換える。 */
export function formulaMatchText(sim: number): string {
  if (sim >= 0.95) return "中身はほとんど同じ処方です";
  if (sim >= 0.85) return "中身はかなり似た処方です";
  if (sim >= 0.7) return "似た処方です";
  if (sim >= 0.5) return "一部の成分が共通しています";
  return "処方は違います";
}

export function formulaMatchBadge(sim: number): string {
  if (sim >= 0.95) return "中身ほぼ同じ";
  if (sim >= 0.85) return "中身かなり似てる";
  if (sim >= 0.7) return "中身似てる";
  return "中身は違う";
}

/**
 * HEX を「くすみローズ」のような呼べる名前にする。
 * ユーザーに #B8604A を見せても意味がないため、必ずこの名前を通す。
 */
export function colorName(hex: string): string {
  const { l, a, b } = hexToLab(hex);
  const chroma = Math.sqrt(a * a + b * b);
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;

  if (chroma < 6) {
    if (l > 85) return "ホワイト";
    if (l > 60) return "ライトグレー";
    if (l > 35) return "グレー";
    return "ブラック";
  }

  let base: string;
  if (hue < 15) base = "ローズ";
  else if (hue < 35) base = "レッド";
  else if (hue < 55) base = "コーラル";
  else if (hue < 75) base = "オレンジ";
  else if (hue < 100) base = "ベージュ";
  else if (hue < 160) base = "カーキ";
  else if (hue < 250) base = "ブルー";
  else if (hue < 320) base = "パープル";
  else base = "ピンク";

  const light = l > 72 ? "ライト" : l < 40 ? "ディープ" : "";
  const dull = chroma < 18 ? "くすみ" : chroma > 45 ? "ビビッド" : "";

  return `${dull}${light}${base}`.replace("くすみビビッド", "");
}

/** 色の系統。チップでの絞り込みに使う。 */
export const HUE_GROUPS = ["レッド系", "ピンク系", "オレンジ系", "ブラウン系", "プラム系", "その他"] as const;
export type HueGroup = (typeof HUE_GROUPS)[number];

export function hueGroup(hex: string): HueGroup {
  const { l, a, b } = hexToLab(hex);
  const chroma = Math.sqrt(a * a + b * b);
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;

  if (chroma < 8) return "その他";
  if (hue >= 300 || hue < 8) return "プラム系";
  if (hue < 25) return chroma < 25 ? "ピンク系" : "レッド系";
  if (hue < 45) return l < 55 && chroma < 32 ? "ブラウン系" : "レッド系";
  if (hue < 70) return l < 55 ? "ブラウン系" : "オレンジ系";
  if (hue < 95) return "ブラウン系";
  return "その他";
}

/** ほぼ同じ色は 1 つにまとめる。棚の前で迷う数を減らすため。 */
export function dedupeShades<T extends { hex: string }>(shades: T[], minDelta = 2): T[] {
  const kept: T[] = [];
  for (const s of shades) {
    if (kept.some((k) => deltaE(k.hex, s.hex) < minDelta)) continue;
    kept.push(s);
  }
  return kept;
}

/** 肌の色に近い順。ファンデの「あなたはこの番号」に使う。 */
export function sortBySkinTone<T extends { hex: string }>(shades: T[], skinHex: string): T[] {
  return [...shades].sort((x, y) => deltaE(skinHex, x.hex) - deltaE(skinHex, y.hex));
}
