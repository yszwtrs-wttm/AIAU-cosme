"use server";

import { getMyProfile } from "@/lib/auth";
import {
  searchProducts,
  withFitOrder,
  type ProductPage,
  type ProductQuery,
} from "@/lib/products";
import { createClient } from "@/lib/supabase/server";

/** 「もっと見る」の追加取得。並び替えは DB 側と同じ条件で続きを読む。 */
export async function loadMoreProducts(query: ProductQuery): Promise<ProductPage> {
  const supabase = await createClient();
  const page = await searchProducts(supabase, query);

  if ((query.sort ?? "recommended") !== "recommended") return page;

  return { ...page, products: withFitOrder(page.products, await getMyProfile()) };
}
