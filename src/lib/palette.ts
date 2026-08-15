import type { ExtractedColor } from "./color";

/** 色抽出はこの幅まで縮小してから走らせる。高解像度写真でも一定時間で終わらせるため。 */
export const PALETTE_SAMPLE_WIDTH = 160;

/** 選び分けられないほど近い色は捨てる閾値（ΔE）。 */
export const PALETTE_MIN_DELTA = 4;

export type PaletteRequest = { id: number; bitmap: ImageBitmap };

export type PaletteResponse =
  | { id: number; palette: ExtractedColor[] }
  | { id: number; error: string };

/** 縮小後の高さ。アスペクト比を保つ。 */
export function sampleHeight(width: number, height: number): number {
  return Math.max(1, Math.round((height / width) * PALETTE_SAMPLE_WIDTH));
}
