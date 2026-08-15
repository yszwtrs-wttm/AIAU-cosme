import { notFound } from "next/navigation";
import ComparePanel, { type CompareSide } from "@/components/ComparePanel";
import DupeRowItem from "@/components/DupeRowItem";
import FeelChart from "@/components/FeelChart";
import FitCard from "@/components/FitCard";
import IngredientPanel from "@/components/IngredientPanel";
import ReviewPanel from "@/components/ReviewPanel";
import ProductThumb from "@/components/ProductThumb";
import StashButton from "@/components/StashButton";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";
import { axesFor, estimateFeel } from "@/lib/feel";
import { judgeFit } from "@/lib/fit";
import { ingredientKey } from "@/lib/ingredients";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_LABEL,
  type DupeRow,
  type FeelSummary,
  type PaletteCoverage,
  type Product,
  type RatingSummary,
  type Review,
} from "@/lib/types";
import { colorDifferenceText, colorMatchText, colorName, formulaMatchText } from "@/lib/wording";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const supabase = await createClient();
  const user = await getMyUser();

  const [
    { data: product },
    { data: owned },
    dupeRes,
    cheaperRes,
    coverageRes,
    { data: reviews },
    { data: summary },
    { data: feelSummary },
    profile,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)",
      )
      .eq("id", productId)
      .maybeSingle<Product>(),
    user
      ? supabase
          .from("user_items")
          .select("product_id")
          .eq("product_id", productId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.rpc("find_duplicates_in_stash", { p_product_id: productId }),
    supabase.rpc("find_cheaper_dupes", { p_product_id: productId, p_limit: 5 }),
    supabase.rpc("find_palette_coverage", { p_product_id: productId }),
    supabase
      .from("reviews")
      .select(
        "*,profiles(handle,display_name,avatar_hue,avatar_url,skin_type,skin_tone_hex),review_images(id,review_id,path,pos)",
      )
      .eq("product_id", productId)
      .order("posted_at", { ascending: false })
      .returns<Review[]>(),
    supabase.from("product_rating_summary").select("*").eq("product_id", productId).maybeSingle<RatingSummary>(),
    supabase.from("product_feel_summary").select("*").eq("product_id", productId).maybeSingle<FeelSummary>(),
    getMyProfile(),
  ]);

  if (!product) notFound();

  let avoidedIngredientLabels: string[] = [];
  if (user && product.ingredients.length > 0) {
    const { data: allergenRows } = await supabase
      .from("profile_allergens")
      .select("ingredient_id")
      .eq("user_id", user.id);
    const ingredientIds = (allergenRows ?? []).map((row) => row.ingredient_id);
    if (ingredientIds.length > 0) {
      const { data: masters } = await supabase
        .from("ingredients_master")
        .select("id,inci,name_ja")
        .in("id", ingredientIds);
      // 表記ゆれ（日本語表示名・慣用名）で書かれていても同じ成分として突き合わせる。
      const productIngredients = new Set(product.ingredients.map(ingredientKey));
      avoidedIngredientLabels = (masters ?? [])
        .filter((ingredient) => productIngredients.has(ingredientKey(ingredient.inci)))
        .map((ingredient) => ingredient.name_ja || ingredient.inci);
    }
  }

  const dupes = (dupeRes.data ?? []) as DupeRow[];
  const cheaper = (cheaperRes.data ?? []) as DupeRow[];
  const topDupe = dupes[0];
  const cheapestSimilar = cheaper[0];
  const shades = [...(product.product_colors ?? [])].sort((a, b) => a.pos - b.pos);
  const coverage = (coverageRes.data ?? []) as PaletteCoverage[];
  const covered = coverage.filter((c) => c.owned_product_id !== null);

  const axes = axesFor(product.category);
  const measuredFeel = Boolean(feelSummary?.feel && feelSummary.feel_count > 0);
  const feelValues = measuredFeel
    ? Object.fromEntries(Object.entries(feelSummary!.feel!).map(([k, v]) => [k, Number(v)]))
    : estimateFeel(product.category, product.ingredients);

  // 高い方の良さを見せる比較。安い候補の成分と口コミ平均も要るので、決まってから取りに行く。
  let compareLow: CompareSide | null = null;
  if (cheapestSimilar) {
    const [{ data: lowProduct }, { data: lowFeel }] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,category,price_yen,ingredients,image_url,brands(name),product_colors(pos,shade_name,hex)")
        .eq("id", cheapestSimilar.product_id)
        .maybeSingle<
          Pick<
            Product,
            | "id"
            | "name"
            | "category"
            | "price_yen"
            | "ingredients"
            | "image_url"
            | "brands"
            | "product_colors"
          >
        >(),
      supabase
        .from("product_feel_summary")
        .select("*")
        .eq("product_id", cheapestSimilar.product_id)
        .maybeSingle<FeelSummary>(),
    ]);

    if (lowProduct) {
      const lowMeasured = Boolean(lowFeel?.feel && lowFeel.feel_count > 0);
      compareLow = {
        productId: lowProduct.id,
        brand: lowProduct.brands?.name ?? "",
        name: lowProduct.name,
        priceYen: lowProduct.price_yen,
        category: lowProduct.category,
        imageUrl: lowProduct.image_url,
        colors: [...(lowProduct.product_colors ?? [])].sort((a, b) => a.pos - b.pos),
        measured: lowMeasured,
        reviewCount: lowFeel?.feel_count ?? 0,
        feel: lowMeasured
          ? Object.fromEntries(Object.entries(lowFeel!.feel!).map(([k, v]) => [k, Number(v)]))
          : estimateFeel(lowProduct.category, lowProduct.ingredients),
      };
    }
  }

  const compareHigh: CompareSide = {
    productId: product.id,
    brand: product.brands?.name ?? "",
    name: product.name,
    priceYen: product.price_yen,
    category: product.category,
    imageUrl: product.image_url,
    colors: shades,
    measured: measuredFeel,
    reviewCount: feelSummary?.feel_count ?? 0,
    feel: feelValues,
  };

  const fit = judgeFit(product, profile);
  const isOwned = Boolean(owned);
  const canUseStash = isRealAccount(user);
  const canPost = canUseStash;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start gap-4 rounded-2xl border border-ink-200 bg-white p-5">
        <ProductThumb
          category={product.category}
          colors={shades}
          imageUrl={product.image_url}
          size={112}
          className="rounded-xl"
        />
        <div className="min-w-64 flex-1">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <span>{product.brands?.name}</span>
            <span>{CATEGORY_LABEL[product.category]}</span>
            {product.is_mens && (
              <span className="rounded bg-ink-900 px-1.5 py-0.5 text-[10px] text-white">MEN</span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold">{product.name}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-sm">
            <span className="text-amber-500">★</span>
            <span className="font-bold tabular-nums">
              {summary?.adjusted_rating != null ? summary.adjusted_rating.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-ink-400">
              {summary?.counted_count ? `（口コミ${summary.counted_count}件）` : "（口コミなし）"}
            </span>
          </div>
          {avoidedIngredientLabels.length > 0 && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              避けたい成分が入っています: {avoidedIngredientLabels.join("、")}
            </p>
          )}
          <div className="mt-1 text-lg font-bold tabular-nums">
            ¥{product.price_yen.toLocaleString()}
            {product.volume && (
              <span className="ml-2 text-xs font-normal text-ink-400">
                {product.volume}
                {product.volume_unit} ・ ¥{Math.round(product.price_yen / product.volume).toLocaleString()}/
                {product.volume_unit}
              </span>
            )}
          </div>
          {shades.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 text-[11px] text-ink-600">
              {shades.map((s) => (
                <li key={s.pos} className="flex items-center gap-1.5 rounded-full border border-ink-100 px-2 py-1">
                  <span className="swatch inline-block h-4 w-4 rounded-full" style={{ background: s.hex }} />
                  {s.shade_name}
                  <span className="text-ink-400">{colorName(s.hex)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <StashButton productId={product.id} owned={isOwned} canUse={canUseStash} />
          </div>
          {isOwned && (
            <p className="mt-2 text-xs font-bold text-brand-700">これは持っている商品です。</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">あなたに合うか</h2>
        <FitCard fit={fit} hasProfile={Boolean(profile?.skin_type || profile?.skin_tone_hex)} />
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">
          {compareLow ? "使い心地とねだんを比べる" : "使い心地"}
        </h2>
        {compareLow ? (
          <ComparePanel axes={axes} high={compareHigh} low={compareLow} />
        ) : (
          <FeelChart axes={axes} values={feelValues} reviewCount={feelSummary?.feel_count ?? 0} />
        )}
      </section>

      {!isOwned && (
        <>
          <section className="space-y-2">
            {topDupe ? (
              <div className="rounded-2xl border border-ink-200 bg-white p-4">
                <p className="text-sm leading-relaxed">
                  ポーチの「{topDupe.brand} {topDupe.name}」と{formulaMatchText(topDupe.ing_sim)}。
                  {topDupe.delta_e !== null && `色は${colorMatchText(topDupe.delta_e).title}。`}
                  {topDupe.delta_e !== null &&
                    topDupe.color_hex &&
                    product.color_hex &&
                    `${colorDifferenceText(topDupe.color_hex, product.color_hex)}`}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  使い分けたい理由があるなら買う意味はあります。同じ用途で足りるなら、持っている方で済みます。
                </p>
                <div className="mt-3 space-y-2">
                  {dupes.map((row) => (
                    <DupeRowItem key={row.product_id} row={row} tone="warn" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-ink-200 bg-white p-4 text-sm">
                <p className="font-bold">ポーチに近いものはありません</p>
                <p className="mt-1 text-xs text-ink-400">
                  持っていない色・処方なので、足りていない役割を埋められます。
                </p>
              </div>
            )}
          </section>

          {coverage.length > 1 && (
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold">手持ちで似た色が出せるか</h2>
              <div className="rounded-2xl border border-ink-200 bg-white p-4">
                <div className="text-sm">
                  <span className="text-lg font-bold">
                    {coverage.length} 色中 {covered.length} 色
                  </span>
                  <span className="ml-2 text-ink-600">は、持っているコスメでほぼ同じ色が作れます</span>
                </div>
                <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {coverage.map((c) => (
                    <li key={c.pos} className="flex items-center gap-2 rounded-xl bg-ink-50 p-2 text-xs">
                      <span className="swatch inline-block h-6 w-6 shrink-0 rounded-full" style={{ background: c.shade_hex }} />
                      <span className="w-24 shrink-0 truncate">{c.shade_name}</span>
                      {c.owned_product_id !== null ? (
                        <span className="flex min-w-0 items-center gap-1.5 text-emerald-800">
                          <span
                            className="swatch inline-block h-4 w-4 shrink-0 rounded-full"
                            style={{ background: c.owned_hex ?? undefined }}
                          />
                          <span className="truncate">
                            {c.owned_label}
                            {c.owned_shade && ` / ${c.owned_shade}`}
                          </span>
                        </span>
                      ) : (
                        <span className="text-ink-400">持っていません</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">商品説明</h2>
        <IngredientPanel ingredients={product.ingredients} />
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">使った人の口コミ</h2>
        <ReviewPanel
          productId={product.id}
          category={product.category}
          initialReviews={reviews ?? []}
          initialSummary={summary ?? null}
          canPost={canPost}
          viewer={{
            skinType: profile?.skin_type ?? null,
            skinToneHex: profile?.skin_tone_hex ?? null,
          }}
        />
      </section>

      {!isOwned && compareLow && cheaper.length > 1 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">ほかの似ていて安いもの</h2>
          {cheaper.slice(1).map((row) => (
            <DupeRowItem key={row.product_id} row={row} tone="save" />
          ))}
        </section>
      )}
    </div>
  );
}
