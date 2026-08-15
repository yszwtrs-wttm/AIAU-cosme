/**
 * 一覧の取得。絞り込み・並び替え・ページングは Postgres の search_products_page に任せる。
 * 商品数が増えても取得件数は 1 ページぶんで固定される。
 */

import { judgeFit } from "./fit";
import type { createClient } from "./supabase/server";
import type { Category, Product, ProductColor, Profile } from "./types";

export const PAGE_SIZE = 20;

export type ProductSort = "recommended" | "new" | "cheap" | "expensive" | "rating";

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "recommended", label: "おすすめ" },
  { value: "new", label: "新着" },
  { value: "cheap", label: "安い順" },
  { value: "expensive", label: "高い順" },
  { value: "rating", label: "評価順" },
];

export function parseSort(value?: string): ProductSort {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as ProductSort)
    : "recommended";
}

export type ProductQuery = {
  q?: string;
  category?: string;
  mens?: boolean;
  sort?: ProductSort;
  limit?: number;
  offset?: number;
};

/** DB 側の並び替えに使った材料を持ったままの商品。ページ内での再計算に使う。 */
export type RankedProduct = Product & {
  ranked_rating: number | null;
  /** ポーチに登録済み */
  owned: boolean;
  /** 避けたい成分が入っている */
  avoided: boolean;
};

export type ProductPage = {
  products: RankedProduct[];
  /** 絞り込み条件に合う全件数。「もっと見る」の判定に使う。 */
  total: number;
  error?: string;
};

export async function searchProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: ProductQuery,
): Promise<ProductPage> {
  const { data, error } = await supabase.rpc("search_products_page", {
    p_q: query.q ?? "",
    p_category: query.category ?? "",
    p_mens: query.mens ?? false,
    p_sort: query.sort ?? "recommended",
    p_limit: query.limit ?? PAGE_SIZE,
    p_offset: query.offset ?? 0,
  });

  const rows = data ?? [];
  const products = rows.map<RankedProduct>((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as Category,
    is_mens: row.is_mens,
    price_yen: row.price_yen,
    volume: row.volume,
    volume_unit: row.volume_unit,
    jan: row.jan,
    image_url: row.image_url,
    color_hex: row.color_hex,
    ingredients: row.ingredients,
    brands: { name: row.brand_name },
    product_colors: (row.product_colors as ProductColor[] | null) ?? [],
    ranked_rating: row.ranked_rating,
    owned: row.owned,
    avoided: row.avoided,
  }));

  return {
    products,
    total: rows[0]?.total_count ?? 0,
    error: error?.message,
  };
}

const SUGGEST_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

/**
 * 0件のときの「もしかして」。表記ゆれ・打ち間違いに近い商品を trgm の類似度上位で返す。
 * 絞り込みは意図的に無視する（0件の原因が絞り込みでも、キーワードに近い商品を出したい）。
 */
export async function suggestProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  q: string,
  limit = 6,
): Promise<Product[]> {
  const { data: similar } = await supabase.rpc("suggest_products", { p_q: q, p_limit: limit });
  const ids = (similar ?? []).map((row) => row.product_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("products")
    .select(SUGGEST_SELECT)
    .in("id", ids)
    .returns<Product[]>();
  const order = new Map(ids.map((id, index) => [id, index]));
  return [...(data ?? [])].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/**
 * おすすめ順の肌情報ぶんの加点。
 * 色差の計算はアプリ側にあるので、DB から受け取ったページの中だけで掛ける。
 * 減点（避けたい成分・登録済み）は DB 側で済んでいるので、同じ重みで足し直す。
 */
export function withFitOrder(products: RankedProduct[], profile: Profile | null): RankedProduct[] {
  if (!profile?.skin_type && !profile?.skin_tone_hex) return products;

  const score = (product: RankedProduct) =>
    (product.ranked_rating ?? 0) -
    (product.owned ? 2 : 0) -
    (product.avoided ? 10 : 0) +
    { good: 3, unknown: 0, caution: -3 }[judgeFit(product, profile).verdict];

  return [...products].sort((a, b) => score(b) - score(a) || b.id - a.id);
}
