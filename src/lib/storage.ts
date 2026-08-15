const BUCKET = "review-images";

/** 口コミ写真は公開バケットに置く。パスから表示用 URL を組む。 */
export function publicImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
