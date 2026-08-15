import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** ログインが要るページはクロールさせず、公開ページだけを対象にする。 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/auth/", "/login", "/settings", "/scan", "/stash", "/me"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
