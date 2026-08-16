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
  adjusted_rating: number | null;
  counted_count: number;
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
  const ratings = new Map<number, { adjusted_rating: number | null; counted_count: number }>();
  if (rows.length > 0) {
    const { data: ratingRows } = await supabase
      .from("product_rating_summary")
      .select("product_id, adjusted_rating, counted_count")
      .in(
        "product_id",
        rows.map((row) => row.id),
      );

    for (const rating of ratingRows ?? []) {
      if (rating.product_id == null) continue;
      ratings.set(rating.product_id, {
        adjusted_rating: rating.adjusted_rating,
        counted_count: rating.counted_count ?? 0,
      });
    }
  }

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
    adjusted_rating: ratings.get(row.id)?.adjusted_rating ?? null,
    counted_count: ratings.get(row.id)?.counted_count ?? 0,
    owned: row.owned,
    avoided: row.avoided,
  }));

  return {
    products,
    total: rows[0]?.total_count ?? 0,
    error: error?.message,
  };
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
