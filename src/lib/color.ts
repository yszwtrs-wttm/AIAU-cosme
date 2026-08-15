import { converter, differenceCiede2000, formatHex } from "culori";

import { deltaETier, SHADE, type DeltaETier } from "./thresholds";

const toLab = converter("lab");
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

const DELTA_E_LABEL: Record<DeltaETier, string> = {
  identical: "肉眼では区別できない",
  indistinguishable: "並べてもほぼ分からない",
  close: "似ている（単体では見分けにくい）",
  noticeable: "違いが分かる",
  far: "別の色",
  distant: "別の色",
};

/** ΔE の意味を日本語に落とす。区切りは `thresholds.json` の一箇所だけで決める。 */
export function deltaELabel(dE: number): string {
  return DELTA_E_LABEL[deltaETier(dE)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return formatHex({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 }) ?? "#000000";
}

type Bucket = { r: number; g: number; b: number; n: number };

function collectBuckets(data: Uint8ClampedArray): Bucket[] {
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (max > 245 && sat < 0.12) continue; // 白背景
    if (max < 25) continue; // 黒つぶれ
    if (sat < 0.08) continue; // 無彩色

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
  minDelta = SHADE.palette_extract_min_delta_e,
): ExtractedColor[] {
  const buckets = collectBuckets(data);
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

  return picked
    .filter((p) => p.n / total >= 0.02)
    .sort((a, b) => b.n - a.n)
    .map((p) => ({ hex: p.hex, share: p.n / total }));
}

/** 画像の主要色（最頻の1色）。 */
export function dominantColorFromImageData(data: Uint8ClampedArray): string {
  const [best] = collectBuckets(data);
  return best ? bucketHex(best) : "#808080";
}
