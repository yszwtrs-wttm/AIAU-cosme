/** アップロードする写真の長辺。これ以上大きい画像はブラウザ側で縮めてから上げる。 */
export const MAX_UPLOAD_EDGE = 1600;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * 長辺 maxEdge に収まるまで縮小し、WebP（使えなければ JPEG）にして返す。
 * 変換できなかったときは元のファイルをそのまま返す。
 */
export async function shrinkImage(
  file: File,
  { maxEdge = MAX_UPLOAD_EDGE, quality = 0.82 }: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const type = canvas.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
    const blob = await canvasToBlob(canvas, type, quality);
    if (!blob || blob.size >= file.size) return file;

    const ext = type === "image/webp" ? "webp" : "jpg";
    const name = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`;
    return new File([blob], name, { type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
