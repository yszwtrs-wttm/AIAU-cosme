/**
 * 写真の使い回し検出に使う pHash（DCT ベース、64bit を 16 進 16 文字で表す）。
 *
 * 32x32 のグレースケールに落として 2 次元 DCT-II をかけ、低周波 8x8 を中央値で
 * 二値化する。リサイズ・トリミング・明度変更に強く、average hash より
 * 「同じ写真の使い回し」を拾いやすい。判定（ハミング距離）は Postgres 側。
 */

/** ハッシュの算出方法。DB 側で世代の違うハッシュを混ぜて比較しないための識別子。 */
export const PHASH_ALGO = "phash_dct_v1";

const SAMPLE = 32;
const LOW_FREQ = 8;

/** DCT-II の係数行列（cos((2x+1) k pi / 2N)）。サイズ固定なので一度だけ作る。 */
const COS_TABLE = (() => {
  const table = new Float64Array(SAMPLE * SAMPLE);
  for (let k = 0; k < SAMPLE; k += 1) {
    for (let x = 0; x < SAMPLE; x += 1) {
      table[k * SAMPLE + x] = Math.cos(((2 * x + 1) * k * Math.PI) / (2 * SAMPLE));
    }
  }
  return table;
})();

function dct1d(input: Float64Array, output: Float64Array, offset: number, stride: number) {
  for (let k = 0; k < SAMPLE; k += 1) {
    let sum = 0;
    for (let x = 0; x < SAMPLE; x += 1) {
      sum += input[offset + x * stride] * COS_TABLE[k * SAMPLE + x];
    }
    output[offset + k * stride] = sum;
  }
}

/** 32x32 のグレースケール輝度から 64bit の pHash（16 進 16 文字）を作る。 */
export function phashFromGrayscale(gray: ArrayLike<number>): string | null {
  if (gray.length !== SAMPLE * SAMPLE) return null;

  const rows = new Float64Array(SAMPLE * SAMPLE);
  const source = new Float64Array(SAMPLE * SAMPLE);
  for (let i = 0; i < source.length; i += 1) source[i] = gray[i];

  for (let y = 0; y < SAMPLE; y += 1) dct1d(source, rows, y * SAMPLE, 1);
  const dct = new Float64Array(SAMPLE * SAMPLE);
  for (let x = 0; x < SAMPLE; x += 1) dct1d(rows, dct, x, SAMPLE);

  const low: number[] = [];
  for (let y = 0; y < LOW_FREQ; y += 1) {
    for (let x = 0; x < LOW_FREQ; x += 1) low.push(dct[y * SAMPLE + x]);
  }

  const sorted = [...low].sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;

  let hex = "";
  for (let i = 0; i < low.length; i += 4) {
    let nibble = 0;
    for (let j = 0; j < 4; j += 1) {
      nibble = (nibble << 1) | (low[i + j] > median ? 1 : 0);
    }
    hex += nibble.toString(16);
  }
  return hex;
}

/** 16 進 16 文字のハッシュ同士のハミング距離。0 に近いほど同じ写真。 */
export function hammingDistance(a: string, b: string): number | null {
  if (a.length !== 16 || b.length !== 16) return null;
  let distance = 0;
  for (let i = 0; i < 16; i += 1) {
    let diff = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    if (Number.isNaN(diff)) return null;
    while (diff > 0) {
      distance += diff & 1;
      diff >>= 1;
    }
  }
  return distance;
}

export async function perceptualHash(file: File): Promise<string | null> {
  if (typeof document === "undefined") return null;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, SAMPLE, SAMPLE);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
  const gray = new Float64Array(SAMPLE * SAMPLE);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  return phashFromGrayscale(gray);
}
