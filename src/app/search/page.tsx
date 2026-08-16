import Link from "next/link";
import { Palette, Search } from "lucide-react";
import ProductList from "@/components/ProductList";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";
import {
  PAGE_SIZE,
  SORT_OPTIONS,
  parseSort,
  searchProducts,
  withFitOrder,
  type ProductQuery,
  type ProductSort,
} from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, type Category } from "@/lib/types";

const CATEGORIES: Category[] = [
  "lip",
  "eyeshadow",
  "eyebrow",
  "foundation",
  "bb",
  "shampoo",
  "treatment",
];
const CHIP = "rounded-full border px-3 py-1.5 text-sm transition";
const CHIP_ON = "border-ink-900 bg-ink-900 text-white";
const CHIP_OFF = "border-ink-200 bg-white text-ink-600 hover:border-ink-400";

function filterHref({
  q,
  category,
  mens,
  sort,
}: {
  q?: string;
  category?: string;
  mens?: string;
  sort?: ProductSort;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (mens === "1" || mens === "0") params.set("mens", mens);
  if (sort && sort !== "recommended") params.set("sort", sort);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; mens?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const supabase = await createClient();
  const user = await getMyUser();
  const realUser = user && isRealAccount(user) ? user : null;
  const real = Boolean(realUser);

  // メンズ絞り込みは URL の指定が優先。指定が無いときはプロフィールの「メンズ向けを優先」を既定値にする。
  const profile = real ? await getMyProfile() : null;
  const mensOnly = params.mens === "1" || (params.mens !== "0" && Boolean(profile?.prefers_mens));
  const mensFromProfile = mensOnly && params.mens !== "1";

  const query: ProductQuery = {
    q: params.q,
    category: params.category,
    mens: mensOnly,
    sort,
    limit: PAGE_SIZE,
  };

  const [page, { count: allergenCount }, { count: ownedCount }] = await Promise.all([
    searchProducts(supabase, query),
    sort === "recommended" && realUser
      ? supabase
          .from("profile_allergens")
          .select("ingredient_id", { count: "exact", head: true })
          .eq("user_id", realUser.id)
      : Promise.resolve({ count: 0 }),
    sort === "recommended" && realUser
      ? supabase
          .from("user_items")
          .select("product_id", { count: "exact", head: true })
          .eq("user_id", realUser.id)
      : Promise.resolve({ count: 0 }),
  ]);

  const hasSkinInfo = Boolean(profile?.skin_type || profile?.skin_tone_hex);
  const hasPersonalizationMaterial =
    hasSkinInfo || (allergenCount ?? 0) > 0 || (ownedCount ?? 0) > 0;
  const products = sort === "recommended" ? withFitOrder(page.products, profile) : page.products;

  const description =
    sort === "new"
      ? "新しく登録された商品から表示しています。"
      : sort === "cheap"
        ? "価格が安い順に表示しています。"
        : sort === "expensive"
          ? "価格が高い順に表示しています。"
          : sort === "rating"
            ? "信用できる口コミの評価が高い順に表示しています。"
            : hasPersonalizationMaterial
              ? "肌情報・避けたい成分・ポーチをもとに、あなた向けに並べています。"
              : "信用できる口コミの評価が高い順に表示しています。";
  const mensNote = mensFromProfile
    ? "設定の「メンズ向けを優先」に従って、メンズ向けの商品だけを表示しています。"
    : mensOnly
      ? "メンズ向けの商品だけを表示しています。"
      : null;

  return (
    <div className="space-y-6">
      <section className="space-y-4 border-b border-ink-200 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold">商品を探す</h1>
          <p className="mt-1 text-sm text-ink-600">{description}</p>
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
              placeholder="商品名・ブランド名で探す"
              className="w-full rounded-full border border-ink-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand-400"
            />
          </label>
          {params.category && <input type="hidden" name="category" value={params.category} />}
          {(params.mens === "1" || params.mens === "0") && (
            <input type="hidden" name="mens" value={params.mens} />
          )}
          {sort !== "recommended" && <input type="hidden" name="sort" value={sort} />}
          <button
            type="submit"
            className="rounded-full bg-ink-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            検索
          </button>
        </form>
        {/* 色で探したい人は商品名が分からないので、検索欄の直下に写真からの導線を置く。 */}
        <Link
          href="/color"
          prefetch
          className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-ink-700"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white text-brand-600">
            <Palette size={15} />
          </span>
          <span className="min-w-0">
            <span className="block font-bold">写真の色から探す</span>
            <span className="block text-xs text-ink-500">
              なりたい色の写真から、近い色のコスメを探せます
            </span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={filterHref({ q: params.q, mens: mensOnly ? "0" : undefined, sort })}
            className={`${CHIP} ${!params.category && !mensOnly ? CHIP_ON : CHIP_OFF}`}
          >
            すべて
          </Link>
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={filterHref({ q: params.q, category, mens: params.mens, sort })}
              className={`${CHIP} ${params.category === category ? CHIP_ON : CHIP_OFF}`}
            >
              {CATEGORY_LABEL[category]}
            </Link>
          ))}
          <Link
            href={filterHref({
              q: params.q,
              category: params.category,
              mens: mensOnly ? "0" : "1",
              sort,
            })}
            className={`${CHIP} ${mensOnly ? CHIP_ON : CHIP_OFF}`}
          >
            メンズ
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink-400">並び替え</span>
          {SORT_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={filterHref({
                q: params.q,
                category: params.category,
                mens: params.mens,
                sort: option.value,
              })}
              className={`${CHIP} ${
                sort === option.value ? CHIP_ON : CHIP_OFF
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </section>

      {mensNote && <p className="text-sm text-ink-600">{mensNote}</p>}

      {sort === "recommended" && !hasPersonalizationMaterial && (
        <p className="rounded-2xl border border-ink-200 bg-white p-4 text-sm text-ink-600">
          まだあなた向けに並べる材料がありません。{" "}
          <Link href={real ? "/settings" : "/login"} className="font-bold text-brand-600 underline">
            {real ? "肌情報や避けたい成分を登録する" : "ログインして自分向けに探す"}
          </Link>
        </p>
      )}

      {params.q && <p className="text-sm text-ink-600">「{params.q}」の検索結果：{page.total}件</p>}
      {page.error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          商品を取得できませんでした: {page.error}
        </p>
      )}
      <ProductList
        key={`${params.q ?? ""}|${params.category ?? ""}|${params.mens ?? ""}|${sort}`}
        initial={products}
        total={page.total}
        query={query}
      />
    </div>
  );
}
