import { converter, differenceCiede2000, formatHex } from "culori";

// CIEDE2000 も Postgres 側の hex_to_lab も D65 基準の CIELAB。JS 側も lab65 に揃える。
const toLab = converter("lab65");
const diff = differenceCiede2000();

export type Lab = { l: number; a: number; b: number };

export function hexToLab(hex: string): Lab {
  const lab = toLab(hex);
  if (!lab) throw new Error(`invalid hex: ${hex}`);
  return { l: lab.l, a: lab.a, b: lab.b };
}

export function labArray(hex: string): [number, number, number] {
  const { l, a, b } = hexToLab(hex);
  return [l, a, b];
}

export function deltaE(hexA: string, hexB: string): number {
  return diff(hexA, hexB);
}

/** LAB 値そのものの ΔE(CIEDE2000)。DB から返る color_lab の比較に使う。 */
export function deltaELab(a: Lab, b: Lab): number {
  return diff({ mode: "lab65", ...a }, { mode: "lab65", ...b });
}

/** ΔE の意味を日本語に落とす。CIEDE2000 の一般的な解釈に沿った区切り。 */
export function deltaELabel(dE: number): string {
  if (dE < 1) return "肉眼では区別できない";
  if (dE < 2) return "並べてもほぼ分からない";
  if (dE < 5) return "似ている（単体では見分けにくい）";
  if (dE < 10) return "違いが分かる";
  return "別の色";
}

export function rgbToHex(r: number, g: number, b: number): string {
  return formatHex({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 }) ?? "#000000";
}

type Bucket = { r: number; g: number; b: number; n: number };

/**
 * 画素を捨てる基準。彩度だけで切るとベージュ・グレージュ・肌色のような
 * 低彩度の色まで落ちるので、明度と彩度の2軸で「明るくて無彩色（=背景）」を除く。
 */
export type ColorFilter = {
  /** これより低い彩度は無彩色として捨てる。 */
  minSat: number;
  /** 背景と見なす明るさの下限（0-255）。 */
  bgValue: number;
  /** 背景と見なす彩度の上限。 */
  bgSat: number;
};

const DEFAULT_FILTER: ColorFilter = { minSat: 0.05, bgValue: 232, bgSat: 0.06 };

/** ファンデーション・肌色向け。ベージュ〜グレージュを残す。 */
export const SKIN_FILTER: ColorFilter = { minSat: 0.02, bgValue: 240, bgSat: 0.04 };

/** 0色になったときの再試行用。ほぼ純白だけを背景として捨てる。 */
const LOOSE_FILTER: ColorFilter = { minSat: 0, bgValue: 248, bgSat: 0.03 };

function collectBuckets(data: Uint8ClampedArray, filter: ColorFilter = DEFAULT_FILTER): Bucket[] {
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (max < 25) continue; // 黒つぶれ
    if (max > filter.bgValue && sat < filter.bgSat) continue; // 明るい無彩色（白背景）
    if (sat < filter.minSat) continue; // 無彩色

    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    cur.r += r;
    cur.g += g;
    cur.b += b;
    cur.n += 1;
    buckets.set(key, cur);
  }

  return [...buckets.values()].sort((x, y) => y.n - x.n);
}

function bucketHex(bucket: Bucket): string {
  return rgbToHex(
    Math.round(bucket.r / bucket.n),
    Math.round(bucket.g / bucket.n),
    Math.round(bucket.b / bucket.n),
  );
}

export type ExtractedColor = { hex: string; share: number };

/**
 * 画像から代表色を複数取り出す。アイシャドウパレットのように色が並んだ商品画像を
 * 1 色に潰さないため、量子化した色塊を頻度順に見て、既に採った色と ΔE が近いものは捨てる。
 */
export function extractPalette(
  data: Uint8ClampedArray,
  maxColors = 6,
  minDelta = 12,
  filter: ColorFilter = DEFAULT_FILTER,
): ExtractedColor[] {
  const found = pickColors(data, maxColors, minDelta, filter);
  if (found.length > 0) return found;
  // 低彩度ばかりの写真で全部落ちることがあるので、背景判定だけ残して緩め直す。
  return pickColors(data, maxColors, minDelta, LOOSE_FILTER);
}

function pickColors(
  data: Uint8ClampedArray,
  maxColors: number,
  minDelta: number,
  filter: ColorFilter,
): ExtractedColor[] {
  const buckets = collectBuckets(data, filter);
  const total = buckets.reduce((sum, b) => sum + b.n, 0);
  if (total === 0) return [];

  const picked: { hex: string; n: number }[] = [];
  for (const bucket of buckets) {
    if (picked.length >= maxColors) break;
    const hex = bucketHex(bucket);
    const near = picked.find((p) => deltaE(p.hex, hex) < minDelta);
    if (near) {
      near.n += bucket.n;
      continue;
    }
    picked.push({ hex, n: bucket.n });
  }

  const sorted = picked.sort((a, b) => b.n - a.n);
  const kept = sorted.filter((p) => p.n / total >= 0.02);
  return (kept.length > 0 ? kept : sorted.slice(0, 1)).map((p) => ({
    hex: p.hex,
    share: p.n / total,
  }));
}

/** 画像の主要色（最頻の1色）。 */
export function dominantColorFromImageData(
  data: Uint8ClampedArray,
  filter: ColorFilter = DEFAULT_FILTER,
): string {
  const [best] = collectBuckets(data, filter);
  if (best) return bucketHex(best);
  const [loose] = collectBuckets(data, LOOSE_FILTER);
  return loose ? bucketHex(loose) : "#808080";
}
