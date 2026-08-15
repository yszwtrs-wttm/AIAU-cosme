/**
 * 写真からの色抽出をメインスレッドから外す。
 * 高解像度写真をタップした直後に画面が固まって見える問題への対応。
 */
import { extractPalette } from "./color";
import {
  PALETTE_MIN_DELTA,
  PALETTE_SAMPLE_WIDTH,
  sampleHeight,
  type PaletteRequest,
  type PaletteResponse,
} from "./palette";
import { dedupeShades } from "./wording";

// tsconfig の lib は dom なので、Worker スコープぶんだけ最小の型を当てる。
type WorkerScope = {
  addEventListener(type: "message", listener: (event: MessageEvent<PaletteRequest>) => void): void;
  postMessage(message: PaletteResponse): void;
};

const worker = self as unknown as WorkerScope;

worker.addEventListener("message", (event) => {
  const { id, bitmap } = event.data;
  try {
    const w = PALETTE_SAMPLE_WIDTH;
    const h = sampleHeight(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);
    // ほぼ同じ色が並ぶと選べないので、見分けのつく色だけ残す。
    const palette = dedupeShades(extractPalette(ctx.getImageData(0, 0, w, h).data), PALETTE_MIN_DELTA);
    const done: PaletteResponse = { id, palette };
    worker.postMessage(done);
  } catch (e) {
    const failed: PaletteResponse = { id, error: e instanceof Error ? e.message : String(e) };
    worker.postMessage(failed);
  } finally {
    bitmap.close();
  }
});
