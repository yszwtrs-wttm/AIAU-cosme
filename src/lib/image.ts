/**
 * 口コミ写真の検証と縮小。スマホの大きな写真をそのまま上げると時間がかかり、
 * EXIF の向きで横倒しになるので、canvas で向きを反映しつつ長辺を縮める。
 */

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
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export type PreparedImage = { blob: Blob; contentType: string; ext: string };

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/heic" || contentType === "image/heif") return "heic";
  return "jpg";
}

function typeOf(file: File): string {
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
  const type = typeOf(file);
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)) {
    return `${file.name} は対応していない形式です（JPEG / PNG / WebP / HEIC）`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} は大きすぎます（${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB以下）`;
  }
  return null;
}

/**
 * 長辺 1600px の JPEG に縮小する。EXIF の向きは createImageBitmap に反映させる。
 * 縮小できない形式（HEIC など）や縮小して逆に重くなる場合は元のファイルを返す。
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const type = typeOf(file);
  const original: PreparedImage = {
    blob: file,
    contentType: type || "application/octet-stream",
    ext: extensionFor(type),
  };
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return original;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return original;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return original;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });
  if (!blob) return original;
  if (scale === 1 && blob.size >= file.size) return original;

  return { blob, contentType: "image/jpeg", ext: "jpg" };
}
