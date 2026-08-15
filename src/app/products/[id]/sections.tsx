import ComparePanel from "@/components/ComparePanel";
import DupeRowItem from "@/components/DupeRowItem";
import FeelChart from "@/components/FeelChart";
import FitCard from "@/components/FitCard";
import ReviewPanel from "@/components/ReviewPanel";
import { SkeletonBox, SkeletonCard, SkeletonSection } from "@/components/Skeleton";
import { getMyProfile } from "@/lib/auth";
import { axesFor } from "@/lib/feel";
import { judgeFit } from "@/lib/fit";
import type { Product } from "@/lib/types";
import { colorDifferenceText, colorMatchText, formulaMatchText } from "@/lib/wording";
import {
  feelValuesOf,
  getAvoidedIngredients,
  getCheaperDupes,
  getCompareLow,
  getDupesInStash,
  getFeelSummary,
  getPaletteCoverage,
  getRatingSummary,
  getReviews,
} from "./queries";

/** 総合評価。集計ビューを待つあいだも商品名・価格は先に出したいので切り出す。 */
export async function RatingLine({ productId }: { productId: number }) {
  const summary = await getRatingSummary(productId);
  return (
    <>
      <span className="font-bold tabular-nums">
        {summary?.adjusted_rating != null ? summary.adjusted_rating.toFixed(1) : "—"}
      </span>
      <span className="text-xs text-ink-400">
        {summary?.counted_count ? `（口コミ${summary.counted_count}件）` : "（口コミなし）"}
      </span>
    </>
  );
}

export function RatingLineSkeleton() {
  return <SkeletonBox className="h-4 w-28 animate-pulse" />;
}

export async function AvoidedIngredientsNote({ productId }: { productId: number }) {
  const labels = await getAvoidedIngredients(productId);
  if (labels.length === 0) return null;
  return (
    <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
      避けたい成分が入っています: {labels.join("、")}
    </p>
  );
}

export async function FitSection({ product }: { product: Product }) {
  const profile = await getMyProfile();
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold">あなたに合うか</h2>
      <FitCard
        fit={judgeFit(product, profile)}
        hasProfile={Boolean(profile?.skin_type || profile?.skin_tone_hex)}
      />
    </section>
  );
}

export async function FeelSection({ product }: { product: Product }) {
  const [feelSummary, compareLow] = await Promise.all([
    getFeelSummary(product.id),
    getCompareLow(product.id),
  ]);
  const { measured, values } = feelValuesOf(product.category, product.ingredients, feelSummary);
  const axes = axesFor(product.category);

  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold">
        {compareLow ? "使い心地とねだんを比べる" : "使い心地"}
      </h2>
      {compareLow ? (
        <ComparePanel
          axes={axes}
          high={{
            productId: product.id,
            brand: product.brands?.name ?? "",
            name: product.name,
            priceYen: product.price_yen,
            category: product.category,
            imageUrl: product.image_url,
            colors: [...(product.product_colors ?? [])].sort((a, b) => a.pos - b.pos),
            measured,
            reviewCount: feelSummary?.feel_count ?? 0,
            feel: values,
          }}
          low={compareLow}
        />
      ) : (
        <FeelChart axes={axes} values={values} reviewCount={feelSummary?.feel_count ?? 0} />
      )}
    </section>
  );
}

export async function DupeSection({ product }: { product: Product }) {
  const dupes = await getDupesInStash(product.id);
  const topDupe = dupes[0];

  return (
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
  );
}

export async function CoverageSection({ productId }: { productId: number }) {
  const coverage = await getPaletteCoverage(productId);
  if (coverage.length <= 1) return null;
  const covered = coverage.filter((c) => c.owned_product_id !== null);

  return (
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
  );
}

export async function ReviewsSection({
  product,
  canPost,
}: {
  product: Product;
  canPost: boolean;
}) {
  const [reviews, summary, profile] = await Promise.all([
    getReviews(product.id),
    getRatingSummary(product.id),
    getMyProfile(),
  ]);

  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold">使った人の口コミ</h2>
      <ReviewPanel
        productId={product.id}
        category={product.category}
        initialReviews={reviews}
        initialSummary={summary}
        canPost={canPost}
        viewer={{
          skinType: profile?.skin_type ?? null,
          skinToneHex: profile?.skin_tone_hex ?? null,
        }}
      />
    </section>
  );
}

export async function CheaperListSection({ productId }: { productId: number }) {
  const cheaper = await getCheaperDupes(productId);
  if (cheaper.length <= 1) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold">ほかの似ていて安いもの</h2>
      {cheaper.slice(1).map((row) => (
        <DupeRowItem key={row.product_id} row={row} tone="save" />
      ))}
    </section>
  );
}

export function TitledSectionSkeleton({ height }: { height: string }) {
  return (
    <SkeletonSection>
      <SkeletonBox className="h-6 w-40" />
      <SkeletonCard className={height} />
    </SkeletonSection>
  );
}

export function CardSectionSkeleton({ height }: { height: string }) {
  return (
    <SkeletonSection>
      <SkeletonCard className={height} />
    </SkeletonSection>
  );
}
