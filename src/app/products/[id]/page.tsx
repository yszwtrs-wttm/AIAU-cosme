import { notFound } from "next/navigation";
import { AlertTriangle, PiggyBank, Sparkles } from "lucide-react";
import DupeRowItem from "@/components/DupeRowItem";
import FeelChart from "@/components/FeelChart";
import IngredientPanel from "@/components/IngredientPanel";
import ReviewPanel from "@/components/ReviewPanel";
import ProductThumb from "@/components/ProductThumb";
import SkipPurchaseButton from "@/components/SkipPurchaseButton";
import StashButton from "@/components/StashButton";
import { isRealAccount } from "@/lib/auth";
import { axesFor, estimateFeel } from "@/lib/feel";
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

  const [
    { data: product },
    { data: owned },
    dupeRes,
    cheaperRes,
    coverageRes,
    { data: reviews },
    { data: summary },
    { data: feelSummary },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)",
      )
      .eq("id", productId)
      .maybeSingle<Product>(),
    supabase.from("user_items").select("product_id").eq("product_id", productId).maybeSingle(),
    supabase.rpc("find_duplicates_in_stash", { p_product_id: productId }),
    supabase.rpc("find_cheaper_dupes", { p_product_id: productId, p_limit: 5 }),
    supabase.rpc("find_palette_coverage", { p_product_id: productId }),
    supabase
      .from("reviews")
      .select("*,profiles(handle,display_name,avatar_hue),review_images(id,review_id,path,pos)")
      .eq("product_id", productId)
      .order("posted_at", { ascending: false })
      .returns<Review[]>(),
    supabase.from("product_rating_summary").select("*").eq("product_id", productId).maybeSingle<RatingSummary>(),
    supabase.from("product_feel_summary").select("*").eq("product_id", productId).maybeSingle<FeelSummary>(),
    supabase.auth.getUser(),
  ]);

  if (!product) notFound();

  const dupes = (dupeRes.data ?? []) as DupeRow[];
  const cheaper = (cheaperRes.data ?? []) as DupeRow[];
  const topDupe = dupes[0];
  const bestSaving = cheaper[0];
  const shades = [...(product.product_colors ?? [])].sort((a, b) => a.pos - b.pos);
  const coverage = (coverageRes.data ?? []) as PaletteCoverage[];
  const covered = coverage.filter((c) => c.owned_product_id !== null);

  const axes = axesFor(product.category);
  const feelValues =
    feelSummary?.feel && feelSummary.feel_count > 0
      ? Object.fromEntries(Object.entries(feelSummary.feel).map(([k, v]) => [k, Number(v)]))
      : estimateFeel(product.category, product.ingredients);

  const isOwned = Boolean(owned);
  const canPost = isRealAccount(user) && isOwned;
  const blockedReason = !isRealAccount(user) ? "login" : "stash";

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start gap-4 rounded-4xl border border-white bg-white/90 p-5 shadow-card">
        <ProductThumb
          category={product.category}
          colors={shades}
          imageUrl={product.image_url}
          size={112}
          className="rounded-3xl"
        />
        <div className="min-w-64 flex-1">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <span>{product.brands?.name}</span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-600">
              {CATEGORY_LABEL[product.category]}
            </span>
            {product.is_mens && (
              <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] text-white">MEN</span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold">{product.name}</h1>
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
                <li key={s.pos} className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 shadow-card">
                  <span className="swatch inline-block h-4 w-4 rounded-full" style={{ background: s.hex }} />
                  {s.shade_name}
                  <span className="text-ink-400">{colorName(s.hex)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <StashButton productId={product.id} owned={isOwned} />
            {topDupe && <SkipPurchaseButton productId={product.id} priceYen={product.price_yen} />}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">買う前チェック</h2>
        {topDupe ? (
          <div className="rounded-4xl border-2 border-amber-300 bg-amber-50 p-5 shadow-card">
            <div className="flex items-center gap-1.5 text-lg font-bold text-amber-900">
              <AlertTriangle size={18} /> それ、もう持っています
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-900">
              ポーチの「{topDupe.brand} {topDupe.name}」と{formulaMatchText(topDupe.ing_sim)}。
              {topDupe.delta_e !== null && `色は${colorMatchText(topDupe.delta_e).title}。`}
              {topDupe.delta_e !== null &&
                topDupe.color_hex &&
                product.color_hex &&
                `${colorDifferenceText(topDupe.color_hex, product.color_hex)}`}
              このまま買うと ¥{product.price_yen.toLocaleString()} を似たものに使うことになります。
            </p>
            <div className="mt-3 space-y-2">
              {dupes.map((row) => (
                <DupeRowItem key={row.product_id} row={row} tone="warn" />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-4xl border border-white bg-white/85 p-5 text-sm text-ink-600 shadow-card">
            <span className="flex items-center gap-1.5 font-bold text-ink-900">
              <Sparkles size={16} className="text-brand-500" /> ポーチに似たものはありません
            </span>
            <p className="mt-1 text-xs text-ink-400">
              持っているコスメを登録しておくと、ここで「もう持ってる」を教えます。
            </p>
          </div>
        )}

        {bestSaving && (
          <div className="rounded-4xl border border-emerald-200 bg-emerald-50 p-5 shadow-card">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <PiggyBank size={18} /> 似た中身で ¥{(bestSaving.savings ?? 0).toLocaleString()} 安いものがあります
            </div>
            <div className="mt-3 space-y-2">
              {cheaper.map((row) => (
                <DupeRowItem key={row.product_id} row={row} tone="save" />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">使い心地</h2>
        <FeelChart axes={axes} values={feelValues} reviewCount={feelSummary?.feel_count ?? 0} />
      </section>

      {coverage.length > 1 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">手持ちで似た色が出せるか</h2>
          <div className="rounded-4xl border border-white bg-white/90 p-4 shadow-card">
            <div className="text-sm">
              <span className="text-lg font-bold text-brand-600">
                {coverage.length} 色中 {covered.length} 色
              </span>
              <span className="ml-2 text-ink-600">は、持っているコスメでほぼ同じ色が作れます</span>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {coverage.map((c) => (
                <li key={c.pos} className="flex items-center gap-2 rounded-2xl bg-brand-50/60 p-2 text-xs">
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

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">成分でわかること</h2>
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
          blockedReason={blockedReason}
        />
      </section>
    </div>
  );
}
