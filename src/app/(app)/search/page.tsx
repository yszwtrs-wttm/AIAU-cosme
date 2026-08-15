import Link from "next/link";
import { Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, type Category, type Product, type ProductScore } from "@/lib/types";

const CATEGORIES: Category[] = ["lip", "eyeshadow", "foundation", "shampoo", "treatment"];
const PRODUCT_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";
const CHIP = "rounded-full border px-3 py-1.5 text-sm transition";
const CHIP_ON = "border-ink-900 bg-ink-900 text-white";
const CHIP_OFF = "border-ink-200 bg-white text-ink-600 hover:border-ink-400";

function filterHref({
  q,
  category,
  mens,
}: {
  q?: string;
  category?: string;
  mens?: string;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (mens === "1") params.set("mens", "1");
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; mens?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("products").select(PRODUCT_SELECT);

  if (params.category) query = query.eq("category", params.category);
  if (params.mens === "1") query = query.eq("is_mens", true);
  if (params.q) query = query.ilike("name", `%${params.q}%`);

  const [{ data, error }, { data: scores }] = await Promise.all([
    query.returns<Product[]>(),
    supabase.from("product_score").select("*").returns<ProductScore[]>(),
  ]);
  const rank = new Map((scores ?? []).map((score) => [score.product_id, score.ranked_rating ?? 0]));
  const products = [...(data ?? [])].sort(
    (a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0),
  );

  return (
    <div className="space-y-6">
      <section className="space-y-4 border-b border-ink-200 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold">商品を探す</h1>
          <p className="mt-1 text-sm text-ink-600">信用できる口コミの評価が高い順に表示しています。</p>
        </div>
        <form method="get" className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="商品名で探す"
              className="w-full rounded-full border border-ink-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand-400"
            />
          </label>
          {params.category && <input type="hidden" name="category" value={params.category} />}
          {params.mens === "1" && <input type="hidden" name="mens" value="1" />}
          <button
            type="submit"
            className="rounded-full bg-ink-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            検索
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={filterHref({ q: params.q })}
            className={`${CHIP} ${!params.category && params.mens !== "1" ? CHIP_ON : CHIP_OFF}`}
          >
            すべて
          </Link>
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={filterHref({ q: params.q, category, mens: params.mens })}
              className={`${CHIP} ${params.category === category ? CHIP_ON : CHIP_OFF}`}
            >
              {CATEGORY_LABEL[category]}
            </Link>
          ))}
          <Link
            href={filterHref({ q: params.q, category: params.category, mens: "1" })}
            className={`${CHIP} ${params.mens === "1" ? CHIP_ON : CHIP_OFF}`}
          >
            メンズ
          </Link>
        </div>
      </section>

      {params.q && <p className="text-sm text-ink-600">「{params.q}」の検索結果：{products.length}件</p>}
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          商品を取得できませんでした: {error.message}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
