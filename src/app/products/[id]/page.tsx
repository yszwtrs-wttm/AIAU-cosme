import { Suspense } from "react";
import { notFound } from "next/navigation";
import IngredientPanel from "@/components/IngredientPanel";
import ProductThumb from "@/components/ProductThumb";
import StashButton from "@/components/StashButton";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { CATEGORY_LABEL } from "@/lib/types";
import { colorName } from "@/lib/wording";
import { getProduct, isOwnedByMe } from "./queries";
import {
  AvoidedIngredientsNote,
  CardSectionSkeleton,
  CheaperListSection,
  CoverageSection,
  DupeSection,
  FeelSection,
  FitSection,
  RatingLine,
  RatingLineSkeleton,
  ReviewsSection,
  TitledSectionSkeleton,
} from "./sections";

/**
 * 被り検出・口コミ・比較は問い合わせが重いので、商品名・価格・色を先に出して
 * 残りはセクションごとに Suspense で流し込む。
 */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const [product, isOwned, user] = await Promise.all([
    getProduct(productId),
    isOwnedByMe(productId),
    getMyUser(),
  ]);

  if (!product) notFound();

  const shades = [...(product.product_colors ?? [])].sort((a, b) => a.pos - b.pos);
  const canUseStash = isRealAccount(user);

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
            <Suspense fallback={<RatingLineSkeleton />}>
              <RatingLine productId={product.id} />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <AvoidedIngredientsNote productId={product.id} />
          </Suspense>
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
          {isOwned && <p className="mt-2 text-xs font-bold text-brand-700">これは持っている商品です。</p>}
        </div>
      </section>

      <Suspense fallback={<TitledSectionSkeleton height="h-24" />}>
        <FitSection product={product} />
      </Suspense>

      <Suspense fallback={<TitledSectionSkeleton height="h-64" />}>
        <FeelSection product={product} />
      </Suspense>

      {!isOwned && (
        <>
          <Suspense fallback={<CardSectionSkeleton height="h-28" />}>
            <DupeSection product={product} />
          </Suspense>

          <Suspense fallback={null}>
            <CoverageSection productId={product.id} />
          </Suspense>
        </>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">商品説明</h2>
        <IngredientPanel ingredients={product.ingredients} />
      </section>

      <Suspense fallback={<TitledSectionSkeleton height="h-48" />}>
        <ReviewsSection product={product} canPost={canUseStash} />
      </Suspense>

      {!isOwned && (
        <Suspense fallback={null}>
          <CheaperListSection productId={product.id} />
        </Suspense>
      )}
    </div>
  );
}
