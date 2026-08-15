const BUCKET = "review-images";

/** 一覧のサムネ幅。拡大表示や単体表示はもっと大きい幅を渡す。 */
export const THUMB_WIDTH = 640;

/** Storage の画像変換 API が使えない環境では `false` を入れて原寸配信に戻す。 */
const TRANSFORM_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM !== "false";

/** 口コミ写真は公開バケットに置く。パスから表示用 URL を組む。 */
export function publicImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * 表示幅に合わせて縮小した URL を返す。画像変換が使えない環境では原寸の URL に
 * そのまま落とすので、呼び出し側は幅を気にせず渡してよい。
 */
export function imageUrl(path: string, { width, quality = 70 }: { width?: number; quality?: number } = {}): string {
  if (!TRANSFORM_ENABLED || !width) return publicImageUrl(path);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const params = new URLSearchParams({
    width: String(width),
    quality: String(quality),
    resize: "contain",
  });
  return `${base}/storage/v1/render/image/public/${BUCKET}/${path}?${params.toString()}`;
}
