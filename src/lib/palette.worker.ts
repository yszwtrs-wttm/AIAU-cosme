/**
 * 写真からの色抽出をメインスレッドから外す。
 * 高解像度写真をタップした直後に画面が固まって見える問題への対応。
 */
import {
  PALETTE_SAMPLE_WIDTH,
  paletteFor,
  sampleHeight,
  type PaletteRequest,
  type PaletteResponse,
} from "./palette";

// tsconfig の lib は dom なので、Worker スコープぶんだけ最小の型を当てる。
type WorkerScope = {
  addEventListener(type: "message", listener: (event: MessageEvent<PaletteRequest>) => void): void;
  postMessage(message: PaletteResponse, transfer?: Transferable[]): void;
};

const worker = self as unknown as WorkerScope;

worker.addEventListener("message", (event) => {
  const { id, bitmap, category } = event.data;
  try {
    const w = PALETTE_SAMPLE_WIDTH;
    const h = sampleHeight(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    // カテゴリを切り替えたときに再抽出できるよう、縮小後の画素も返す。
    worker.postMessage({ id, palette: paletteFor(data, category), data }, [data.buffer]);
  } catch (e) {
    const failed: PaletteResponse = { id, error: e instanceof Error ? e.message : String(e) };
    worker.postMessage(failed);
  } finally {
    bitmap.close();
  }
});
