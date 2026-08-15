import { extractPalette, SKIN_FILTER, type ExtractedColor } from "./color";
import { dedupeShades } from "./wording";

/** 色抽出はこの幅まで縮小してから走らせる。高解像度写真でも一定時間で終わらせるため。 */
export const PALETTE_SAMPLE_WIDTH = 160;

/** 画面に出す色数の上限。 */
export const PALETTE_MAX_COLORS = 6;

/** 別の色として扱う最小の ΔE。 */
export const PALETTE_MIN_DELTA = 12;

/** 選び分けられないほど近い色を捨てる ΔE。 */
export const PALETTE_DEDUPE_DELTA = 4;

export type PaletteRequest = { id: number; bitmap: ImageBitmap; category: string };

export type PaletteResponse =
  | { id: number; palette: ExtractedColor[]; data: Uint8ClampedArray }
  | { id: number; error: string };

/** 縮小後の高さ。アスペクト比を保つ。 */
export function sampleHeight(width: number, height: number): number {
  return Math.max(1, Math.round((height / width) * PALETTE_SAMPLE_WIDTH));
}

/** ファンデは肌色（低彩度）が本命なので、無彩色を捨てるしきい値を下げて抽出する。 */
export function paletteFor(data: Uint8ClampedArray, cat: string): ExtractedColor[] {
  return dedupeShades(
    extractPalette(
      data,
      PALETTE_MAX_COLORS,
      PALETTE_MIN_DELTA,
      cat === "foundation" ? SKIN_FILTER : undefined,
    ),
    PALETTE_DEDUPE_DELTA,
  );
}
