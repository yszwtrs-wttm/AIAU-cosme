/**
 * 使用感（ツヤ・マット・伸びなど）。
 *
 * 成分は「中身が同じか」を証明できるが、ユーザーが知りたい使い心地を語れない。
 * ここでは
 *   1. 口コミ投稿時のスライダーの平均値（実測）
 *   2. 口コミが無い商品向けに、配合順から推定した初期値
 * の 2 系統を同じ軸で扱う。
 */

import type { Category } from "./types";

export type FeelAxis = { key: string; label: string; low: string; high: string };

const MAKEUP_AXES: FeelAxis[] = [
  { key: "gloss", label: "ツヤ感", low: "マット", high: "ツヤ" },
  { key: "coverage", label: "カバー力", low: "薄づき", high: "しっかり" },
  { key: "lasting", label: "崩れにくさ", low: "落ちやすい", high: "崩れにくい" },
  { key: "moist", label: "うるおい", low: "さらっと", high: "しっとり" },
  { key: "spread", label: "伸びの軽さ", low: "重い", high: "軽い" },
];

const HAIR_AXES: FeelAxis[] = [
  { key: "foam", label: "泡立ち", low: "少なめ", high: "もっちり" },
  { key: "smooth", label: "きしみにくさ", low: "きしむ", high: "なめらか" },
  { key: "moist", label: "しっとり感", low: "さらさら", high: "しっとり" },
  { key: "scent", label: "香りの強さ", low: "ほのか", high: "しっかり" },
  { key: "lasting", label: "効果の持ち", low: "短め", high: "長め" },
];

export function axesFor(category: Category): FeelAxis[] {
  return category === "shampoo" || category === "treatment" ? HAIR_AXES : MAKEUP_AXES;
}

export type FeelValues = Record<string, number>;

/** 配合順の重み。上位ほど処方への影響が大きい。 */
function weight(list: string[], inci: string): number {
  const i = list.indexOf(inci);
  if (i < 0) return 0;
  return 1 / Math.log2(i + 2);
}

function has(list: string[], pattern: RegExp): number {
  const i = list.findIndex((x) => pattern.test(x));
  if (i < 0) return 0;
  return 1 / Math.log2(i + 2);
}

const clamp = (v: number) => Math.max(5, Math.min(95, Math.round(v)));

/**
 * 成分から使用感を推定する。口コミ 0 件でもチャートを出せるようにするための初期値。
 * 画面では必ず「成分からの推定」と明記して出す。
 */
export function estimateFeel(category: Category, ingredients: string[]): FeelValues {
  const list = ingredients.map((x) => x.toUpperCase());

  if (category === "shampoo" || category === "treatment") {
    const strongSurf = has(list, /LAURETH SULFATE|LAURYL SULFATE/);
    const mildSurf = has(list, /BETAINE|COCOYL GLUTAMATE/);
    const cationic = has(list, /BEHENTRIMONIUM|AMODIMETHICONE|CETEARYL ALCOHOL/);
    const oil = has(list, /OIL|BUTTER|SQUALANE/);
    const scent = has(list, /FRAGRANCE|MENTHOL|MENTHYL/);
    const active = has(list, /PIROCTONE|PYRITHIONE|SALICYLIC|BIOTIN|KERATIN/);

    return {
      foam: clamp(30 + strongSurf * 60 + mildSurf * 35),
      smooth: clamp(35 + cationic * 55 + mildSurf * 25 - strongSurf * 25),
      moist: clamp(30 + oil * 45 + cationic * 35 - strongSurf * 20),
      scent: clamp(20 + scent * 70),
      lasting: clamp(35 + active * 55),
    };
  }

  const wax = has(list, /WAX|CERA ALBA|POLYETHYLENE/);
  const matteFilm = has(list, /TRIMETHYLSILOXYSILICATE|ISODODECANE/);
  const powder = has(list, /SILICA|TALC|BORON NITRIDE/);
  const glossOil = has(list, /DIISOSTEARYL MALATE|HYDROGENATED POLYISOBUTENE|RICINUS|JOJOBA|POLYGLYCERYL/);
  const pearl = has(list, /MICA|FLUORPHLOGOPITE|BOROSILICATE/);
  const pigment = has(list, /TITANIUM DIOXIDE|IRON OXIDES|CI 77/);
  const silicone = has(list, /DIMETHICONE|SILOXANE|METHICONE/);
  const light = has(list, /CAPRYLIC\/CAPRIC|ISODODECANE|CYCLOPENTASILOXANE/);
  const humectant = has(list, /GLYCERIN|HYALURON|BUTYLENE GLYCOL|SQUALANE|BUTTER|OIL/);

  return {
    gloss: clamp(40 + glossOil * 55 + pearl * 20 - powder * 35 - matteFilm * 30),
    coverage: clamp(30 + pigment * 55 + wax * 20 + weight(list, "TITANIUM DIOXIDE") * 20),
    lasting: clamp(35 + matteFilm * 50 + wax * 30 + powder * 15 - glossOil * 15),
    moist: clamp(30 + humectant * 55 - powder * 25 - matteFilm * 20),
    spread: clamp(40 + silicone * 35 + light * 40 - wax * 30),
  };
}

/** 2つの使用感の中で、いちばん差が大きい軸を「言葉」で返す。比較UIで使う。 */
export function biggestFeelGap(
  axes: FeelAxis[],
  mine: FeelValues,
  other: FeelValues,
): { axis: FeelAxis; text: string } | null {
  let best: { axis: FeelAxis; diff: number } | null = null;
  for (const axis of axes) {
    const a = mine[axis.key];
    const b = other[axis.key];
    if (a === undefined || b === undefined) continue;
    const diff = b - a;
    if (!best || Math.abs(diff) > Math.abs(best.diff)) best = { axis, diff };
  }
  if (!best || Math.abs(best.diff) < 12) return null;

  const word = best.diff > 0 ? best.axis.high : best.axis.low;
  return { axis: best.axis, text: `こちらのほうが${word}寄りです` };
}
