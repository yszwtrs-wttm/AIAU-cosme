/** アップロードする写真の長辺。これ以上大きい画像はブラウザ側で縮めてから上げる。 */
export const MAX_UPLOAD_EDGE = 1600;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/** input[type=file] の accept 属性。拡張子も足しておかないと HEIC が選べない端末がある。 */
export const IMAGE_ACCEPT = [...ACCEPTED_IMAGE_TYPES, ".heic", ".heif"].join(",");

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/** type が空で降ってくる端末があるので、拡張子でも判定する。 */
export function imageTypeOf(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "";
}

/** 対応外の形式・大きすぎるファイルは投稿前に弾く。問題なければ null。 */
export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(imageTypeOf(file))) {
    return `${file.name} は対応していない形式です（JPEG / PNG / WebP / HEIC）`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} は大きすぎます（${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB以下）`;
  }
  return null;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * 長辺 maxEdge に収まるまで縮小し、WebP（使えなければ JPEG）にして返す。
 * EXIF の向きは createImageBitmap に反映させるので、横倒しのまま上がらない。
 * 変換できなかったとき（HEIC など decode できない形式）は元のファイルをそのまま返す。
 */
export async function shrinkImage(
  file: File,
  { maxEdge = MAX_UPLOAD_EDGE, quality = 0.82 }: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  if (typeof document === "undefined" || !imageTypeOf(file).startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const type = canvas.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
    const blob = await canvasToBlob(canvas, type, quality);
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;

    const ext = type === "image/webp" ? "webp" : "jpg";
    const name = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`;
    return new File([blob], name, { type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
