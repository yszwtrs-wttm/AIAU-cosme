import Link from "next/link";
import { Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductRequestForm from "@/components/ProductRequestForm";
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
      ? supabase.from("user_items").select("product_id").eq("user_id", realUser.id)
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

  // 0件のときは必ず次の行動を出す。絞り込みを1タップで外すリンクと、
  // 表記ゆれ向けの「もしかして」（trgm 類似度）、それでも無ければ追加リクエスト。
  const recoveries: { label: string; href: string }[] = [];
  if (products.length === 0) {
    if (params.category) {
      const label = CATEGORY_LABEL[params.category as Category] ?? params.category;
      recoveries.push({
        label: `カテゴリ「${label}」を外す`,
        href: filterHref({ q: params.q, mens: params.mens, sort }),
      });
    }
    if (params.mens === "1") {
      recoveries.push({
        label: "メンズ絞り込みを外す",
        href: filterHref({ q: params.q, category: params.category, sort }),
      });
    }
    if (params.q) {
      recoveries.push({
        label: `キーワード「${params.q}」を外す`,
        href: filterHref({ category: params.category, mens: params.mens, sort }),
      });
    }
    if (recoveries.length > 1) {
      recoveries.push({ label: "すべての条件を外して全商品を見る", href: filterHref({ sort }) });
    }
  }

  let suggestions: Product[] = [];
  if (products.length === 0 && params.q) {
    const { data: similar } = await supabase.rpc("suggest_products", {
      p_q: params.q,
      p_limit: 6,
    });
    const ids = (similar ?? []).map((row) => row.product_id);
    if (ids.length > 0) {
      const { data: suggested } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .in("id", ids)
        .returns<Product[]>();
      const order = new Map(ids.map((id, index) => [id, index]));
      suggestions = [...(suggested ?? [])].sort(
        (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
      );
    }
  }

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
      {products.length === 0 && !error ? (
        <section className="space-y-5 rounded-2xl border border-ink-200 bg-white p-5">
          <div>
            <h2 className="font-display text-lg font-bold">条件に合う商品がありませんでした</h2>
            <p className="mt-1 text-sm text-ink-600">条件をゆるめるか、下から探し直せます。</p>
          </div>

          {recoveries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recoveries.map((recovery) => (
                <Link key={recovery.href} href={recovery.href} className={`${CHIP} ${CHIP_OFF}`}>
                  {recovery.label}
                </Link>
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold">もしかして</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestions.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-ink-200 pt-4">
            <p className="text-sm font-bold">探している商品がまだ無いときは</p>
            <ProductRequestForm defaultKeyword={params.q ?? ""} />
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
