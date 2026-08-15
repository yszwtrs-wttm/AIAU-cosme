import { cache } from "react";
import { getMyUser } from "@/lib/auth";
import { estimateFeel } from "@/lib/feel";
import { createClient } from "@/lib/supabase/server";
import type {
  DupeRow,
  FeelSummary,
  PaletteCoverage,
  Product,
  RatingSummary,
  Review,
} from "@/lib/types";
import type { CompareSide } from "@/components/ComparePanel";

const PRODUCT_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

/**
 * セクションごとに Suspense を切ると同じ問い合わせを複数の components から呼ぶので、
 * 1 リクエスト 1 回になるよう cache でまとめる。
 */
export const getProduct = cache(async (productId: number): Promise<Product | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .maybeSingle<Product>();
  return data ?? null;
});

export const isOwnedByMe = cache(async (productId: number): Promise<boolean> => {
  const user = await getMyUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_items")
    .select("product_id")
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(data);
});

export const getRatingSummary = cache(async (productId: number): Promise<RatingSummary | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_rating_summary")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle<RatingSummary>();
  return data ?? null;
});

export const getFeelSummary = cache(async (productId: number): Promise<FeelSummary | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_feel_summary")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle<FeelSummary>();
  return data ?? null;
});

export const getReviews = cache(async (productId: number): Promise<Review[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      "*,profiles(handle,display_name,avatar_hue,avatar_url,skin_type,skin_tone_hex),review_images(id,review_id,path,pos)",
    )
    .eq("product_id", productId)
    .order("posted_at", { ascending: false })
    .returns<Review[]>();
  return data ?? [];
});

export const getDupesInStash = cache(async (productId: number): Promise<DupeRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("find_duplicates_in_stash", { p_product_id: productId });
  return (data ?? []) as DupeRow[];
});

export const getCheaperDupes = cache(async (productId: number): Promise<DupeRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("find_cheaper_dupes", { p_product_id: productId, p_limit: 5 });
  return (data ?? []) as DupeRow[];
});

export const getPaletteCoverage = cache(async (productId: number): Promise<PaletteCoverage[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("find_palette_coverage", { p_product_id: productId });
  return (data ?? []) as PaletteCoverage[];
});

/** プロフィールで避けたい成分に登録されていて、この商品に入っているもの。 */
export const getAvoidedIngredients = cache(async (productId: number): Promise<string[]> => {
  const user = await getMyUser();
  const product = await getProduct(productId);
  if (!user || !product || product.ingredients.length === 0) return [];

  const supabase = await createClient();
  const { data: allergenRows } = await supabase
    .from("profile_allergens")
    .select("ingredient_id")
    .eq("user_id", user.id);
  const ingredientIds = (allergenRows ?? []).map((row) => row.ingredient_id);
  if (ingredientIds.length === 0) return [];

  const { data: masters } = await supabase
    .from("ingredients_master")
    .select("id,inci,name_ja")
    .in("id", ingredientIds);
  const productIngredients = new Set(product.ingredients.map((ingredient) => ingredient.toUpperCase()));
  return (masters ?? [])
    .filter((ingredient) => productIngredients.has(ingredient.inci.toUpperCase()))
    .map((ingredient) => ingredient.name_ja || ingredient.inci);
});

/** 口コミがあれば実測の使用感、無ければ成分からの推定を使う。 */
export function feelValuesOf(
  category: Product["category"],
  ingredients: string[],
  feelSummary: FeelSummary | null,
): { measured: boolean; values: Record<string, number> } {
  const measured = Boolean(feelSummary?.feel && feelSummary.feel_count > 0);
  return {
    measured,
    values: measured
      ? Object.fromEntries(Object.entries(feelSummary!.feel!).map(([k, v]) => [k, Number(v)]))
      : estimateFeel(category, ingredients),
  };
}

/** 比較する安い側。成分と口コミ平均も要るので、候補が決まってから取りに行く。 */
export const getCompareLow = cache(async (productId: number): Promise<CompareSide | null> => {
  const cheaper = await getCheaperDupes(productId);
  const cheapest = cheaper[0];
  if (!cheapest) return null;

  const supabase = await createClient();
  const [{ data: lowProduct }, lowFeel] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,category,price_yen,ingredients,image_url,brands(name),product_colors(pos,shade_name,hex)")
      .eq("id", cheapest.product_id)
      .maybeSingle<
        Pick<
          Product,
          "id" | "name" | "category" | "price_yen" | "ingredients" | "image_url" | "brands" | "product_colors"
        >
      >(),
    getFeelSummary(cheapest.product_id),
  ]);
  if (!lowProduct) return null;

  const { measured, values } = feelValuesOf(lowProduct.category, lowProduct.ingredients, lowFeel);
  return {
    productId: lowProduct.id,
    brand: lowProduct.brands?.name ?? "",
    name: lowProduct.name,
    priceYen: lowProduct.price_yen,
    category: lowProduct.category,
    imageUrl: lowProduct.image_url,
    colors: [...(lowProduct.product_colors ?? [])].sort((a, b) => a.pos - b.pos),
    measured,
    reviewCount: lowFeel?.feel_count ?? 0,
    feel: values,
  };
});
