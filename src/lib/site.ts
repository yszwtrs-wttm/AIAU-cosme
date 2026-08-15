export const SITE_NAME = "KAWANAI";
export const SITE_TAGLINE = "もう持ってるかも";
export const SITE_DESCRIPTION =
  "手持ちコスメと買おうとしている商品を照らし合わせて、「買わなくていい」を教えてくれるアプリ。";

/** OG 画像の絶対 URL を組み立てるための基準。Vercel では VERCEL_URL が入る。 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
