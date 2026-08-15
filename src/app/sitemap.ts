import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { siteUrl } from "@/lib/site";

/** sitemap.xml 1 ファイルの上限は 50,000 URL なので、静的なページ分を残して切る。 */
const PRODUCT_LIMIT = 49_000;

/** 商品は増減するので、1 日ごとに作り直す。 */
export const revalidate = 86_400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/color`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/feed`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
  ];

  // 閲覧はログイン不要なので、Cookie を持たない匿名クライアントで商品を列挙する。
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: products } = await supabase
    .from("products")
    .select("id,created_at")
    .order("id", { ascending: true })
    .limit(PRODUCT_LIMIT);

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map(({ id, created_at }) => ({
    url: `${base}/products/${id}`,
    lastModified: new Date(created_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries];
}
