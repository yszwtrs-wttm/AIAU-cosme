const BUCKET = "review-images";
const AVATAR_BUCKET = "avatars";

/** 口コミ写真は公開バケットに置く。パスから表示用 URL を組む。 */
export function publicImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function publicAvatarUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
