import { converter, differenceCiede2000, formatHex } from "culori";

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

/**
 * 画像の主要色を取り出す。彩度が極端に低い/明るすぎる画素（背景・白飛び）は捨て、
 * 残りを粗い格子に量子化して最頻色の平均を返す。
 */
export function dominantColorFromImageData(data: Uint8ClampedArray): string {
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();

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

  let best: { r: number; g: number; b: number; n: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.n > best.n) best = bucket;
  }
  if (!best) return "#808080";

  return rgbToHex(
    Math.round(best.r / best.n),
    Math.round(best.g / best.n),
    Math.round(best.b / best.n),
  );
}
