/**
 * robots.txt / sitemap.xml に書く絶対 URL の基点。
 * 本番は NEXT_PUBLIC_SITE_URL を設定する。未設定なら Vercel が渡すドメイン、
 * それも無ければローカルの開発サーバーとみなす。
 */
export function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

  const withScheme = /^https?:\/\//.test(configured) ? configured : `https://${configured}`;
  return withScheme.replace(/\/+$/, "");
}
