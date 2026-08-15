import Link from "next/link";
import { Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";
import { judgeFit } from "@/lib/fit";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, type Category, type Product, type ProductScore } from "@/lib/types";

const CATEGORIES: Category[] = ["lip", "eyeshadow", "foundation", "shampoo", "treatment"];
const PRODUCT_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";
const CHIP = "rounded-full border px-3 py-1.5 text-sm transition";
const CHIP_ON = "border-ink-900 bg-ink-900 text-white";
const CHIP_OFF = "border-ink-200 bg-white text-ink-600 hover:border-ink-400";

type Sort = "recommended" | "new" | "cheap" | "expensive" | "rating";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "recommended", label: "おすすめ" },
  { value: "new", label: "新着" },
  { value: "cheap", label: "安い順" },
  { value: "expensive", label: "高い順" },
  { value: "rating", label: "評価順" },
];

function parseSort(value?: string): Sort {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as Sort)
    : "recommended";
}

function filterHref({
  q,
  category,
  mens,
  sort,
}: {
  q?: string;
  category?: string;
  mens?: string;
  sort?: Sort;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (mens === "1") params.set("mens", "1");
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

  let query = supabase.from("products").select(PRODUCT_SELECT);
  if (params.category) query = query.eq("category", params.category);
  if (params.mens === "1") query = query.eq("is_mens", true);
  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (sort === "new") {
    query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
  }

  const [
    { data, error },
    { data: scores },
    profile,
    { data: allergenRows },
    { data: ownedRows },
  ] = await Promise.all([
    query.returns<Product[]>(),
    supabase.from("product_score").select("*").returns<ProductScore[]>(),
    sort === "recommended" && real ? getMyProfile() : Promise.resolve(null),
    sort === "recommended" && realUser
      ? supabase.from("profile_allergens").select("ingredient_id").eq("user_id", realUser.id)
      : Promise.resolve({ data: null }),
    sort === "recommended" && realUser
      ? supabase
          .from("user_items")
          .select("product_id")
          .eq("user_id", realUser.id)
          .is("finished_at", null)
      : Promise.resolve({ data: null }),
  ]);

  const rank = new Map((scores ?? []).map((score) => [score.product_id, score.ranked_rating ?? 0]));
  const allergenIds = (allergenRows ?? []).map((row) => row.ingredient_id);
  const { data: allergenMaster } =
    real && allergenIds.length > 0
      ? await supabase.from("ingredients_master").select("id,inci").in("id", allergenIds)
      : { data: [] };
  const avoidedInci = new Set((allergenMaster ?? []).map((ingredient) => ingredient.inci.toUpperCase()));
  const ownedIds = new Set((ownedRows ?? []).map((row) => row.product_id));
  const hasSkinInfo = Boolean(profile?.skin_type || profile?.skin_tone_hex);
  const hasPersonalizationMaterial = hasSkinInfo || avoidedInci.size > 0 || ownedIds.size > 0;
  const recommendationScores =
    sort === "recommended"
      ? new Map(
          (data ?? []).map((product) => {
            const fitScore = hasSkinInfo
              ? { good: 3, unknown: 0, caution: -3 }[judgeFit(product, profile).verdict]
              : 0;
            const allergenScore = product.ingredients.some((ingredient) =>
              avoidedInci.has(ingredient.toUpperCase()),
            )
              ? -10
              : 0;
            const ownedScore = ownedIds.has(product.id) ? -2 : 0;
            return [
              product.id,
              fitScore + allergenScore + ownedScore + (rank.get(product.id) ?? 0),
            ];
          }),
        )
      : null;

  const products = [...(data ?? [])].sort((a, b) => {
    if (sort === "new") return 0;
    if (sort === "cheap") return a.price_yen - b.price_yen || b.id - a.id;
    if (sort === "expensive") return b.price_yen - a.price_yen || b.id - a.id;
    if (sort === "rating") return (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0) || b.id - a.id;

    return (
      (recommendationScores?.get(b.id) ?? 0) -
        (recommendationScores?.get(a.id) ?? 0) ||
      (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0) ||
      b.id - a.id
    );
  });

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
              placeholder="商品名で探す"
              className="w-full rounded-full border border-ink-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand-400"
            />
          </label>
          {params.category && <input type="hidden" name="category" value={params.category} />}
          {params.mens === "1" && <input type="hidden" name="mens" value="1" />}
          {sort !== "recommended" && <input type="hidden" name="sort" value={sort} />}
          <button
            type="submit"
            className="rounded-full bg-ink-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            検索
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={filterHref({ q: params.q, sort })}
            className={`${CHIP} ${!params.category && params.mens !== "1" ? CHIP_ON : CHIP_OFF}`}
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
            href={filterHref({ q: params.q, category: params.category, mens: "1", sort })}
            className={`${CHIP} ${params.mens === "1" ? CHIP_ON : CHIP_OFF}`}
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

      {sort === "recommended" && !hasPersonalizationMaterial && (
        <p className="rounded-2xl border border-ink-200 bg-white p-4 text-sm text-ink-600">
          まだあなた向けに並べる材料がありません。{" "}
          <Link href={real ? "/settings" : "/login"} className="font-bold text-brand-600 underline">
            {real ? "肌情報や避けたい成分を登録する" : "ログインして自分向けに探す"}
          </Link>
        </p>
      )}

      {params.q && <p className="text-sm text-ink-600">「{params.q}」の検索結果：{products.length}件</p>}
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          商品を取得できませんでした: {error.message}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
