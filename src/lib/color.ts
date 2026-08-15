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
  minDelta = 12,
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

/**
 * 自撮りから肌の色を推定する。
 *
 * 髪・服・背景を拾わないよう中央付近だけを見て、そこから肌になり得る画素
 * （赤 > 緑 > 青 で、彩度と明るさが人の肌の範囲）だけを残し、中央値を取る。
 * 平均だとハイライトや影に引かれるので中央値にする。
 */
export function skinToneFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  const x0 = Math.floor(width * 0.25);
  const x1 = Math.ceil(width * 0.75);
  const y0 = Math.floor(height * 0.2);
  const y1 = Math.ceil(height * 0.8);

  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 4;
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 200) continue;
      if (!(r > g && g > b)) continue;
      const max = r;
      const min = b;
      const sat = (max - min) / max;
      if (sat < 0.1 || sat > 0.62) continue;
      if (r < 60 || r > 250) continue;
      reds.push(r);
      greens.push(g);
      blues.push(b);
    }
  }

  if (reds.length < 200) return null;

  const median = (xs: number[]) => {
    const sorted = [...xs].sort((p, q) => p - q);
    return sorted[Math.floor(sorted.length / 2)];
  };

  return rgbToHex(median(reds), median(greens), median(blues));
}

/** 画像の主要色（最頻の1色）。 */
export function dominantColorFromImageData(data: Uint8ClampedArray): string {
  const [best] = collectBuckets(data);
  return best ? bucketHex(best) : "#808080";
}
