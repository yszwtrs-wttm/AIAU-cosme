import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import { axisDiffs } from "@/lib/compare";
import { PRICE_DISCLAIMER, unitPriceText } from "@/lib/price";
import type { FeelAxis, FeelValues } from "@/lib/feel";
import type { Category, ProductColor } from "@/lib/types";

export type CompareSide = {
  productId: number;
  brand: string;
  name: string;
  priceYen: number;
  volume: number | null;
  volumeUnit: string | null;
  category: Category;
  imageUrl: string | null;
  colors: ProductColor[];
  feel: FeelValues;
  /** 口コミの平均が使えているか（推定なら false） */
  measured: boolean;
  /** 使用感の平均に使った口コミ件数 */
  reviewCount: number;
};

/**
 * 高い方と安い方を並べて、使い心地とねだんの違いを一枚で見せる。
 * 「安い方があるから買うな」で終わらせないために、高い方の良さも同じ大きさで出す。
 */
export default function ComparePanel({
  axes,
  high,
  low,
}: {
  axes: FeelAxis[];
  high: CompareSide;
  low: CompareSide;
}) {
  const diffs = axisDiffs(axes, high.feel, low.feel);
  const priceDiff = high.priceYen - low.priceYen;
  const estimated = !high.measured || !low.measured;

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-brand-500 bg-white">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 bg-brand-50 p-4">
        <SideHead side={high} caption="この商品" />
        <div className="pt-9">
          {priceDiff > 0 && (
            <div className="mx-auto flex items-baseline gap-1 whitespace-nowrap border-2 border-ink-900 bg-white px-2 py-1.5 text-ink-900 sm:px-3">
              <span className="text-base font-bold tabular-nums leading-none sm:text-lg">
                ¥{priceDiff.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold">おトク</span>
            </div>
          )}
        </div>
        <SideHead side={low} caption="似ていて安い方" href={`/products/${low.productId}`} align="right" />
      </div>

      <ul className="divide-y divide-ink-100">
        {diffs.map(({ axis, high: h, low: l, diff }) => {
          const lead = Math.abs(diff) >= 12 ? (diff > 0 ? "high" : "low") : null;
          return (
            <li key={axis.key} className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] font-bold tracking-wide text-ink-900">
                  {axis.label}
                </span>
                <div className="flex min-w-0 flex-1 justify-between text-[10px] text-ink-400">
                  <span>{axis.low}</span>
                  <span>{axis.high}</span>
                </div>
              </div>
              <div className="mt-1.5 space-y-2">
                <Bar value={h} label="この商品" tone="high" lead={lead === "high"} />
                <Bar value={l} label="安い方" tone="low" lead={lead === "low"} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-ink-100 p-4">
        <p className="text-[11px] text-ink-400">
          {estimated
            ? "使い心地は、口コミがまだ少ないため成分からの予想を含みます。"
            : "使い心地は、使った人の口コミの平均です。"}
        </p>
        <p className="mt-1 text-[11px] text-ink-400">{PRICE_DISCLAIMER}</p>
      </div>
    </div>
  );
}

function SideHead({
  side,
  caption,
  href,
  align,
}: {
  side: CompareSide;
  caption: string;
  href?: string;
  align?: "right";
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className="whitespace-nowrap text-[10px] font-bold tracking-wider text-brand-600">
        {caption}
      </div>
      <div
        className={`mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 ${
          align === "right" ? "items-end sm:flex-row-reverse" : "items-start"
        }`}
      >
        <ProductThumb
          category={side.category}
          colors={side.colors}
          imageUrl={side.imageUrl}
          size={72}
          className="max-w-full shrink-0 rounded-xl"
        />
        <div className="min-w-0">
          {href ? (
            <Link
              href={href}
              className="block text-sm font-bold leading-tight line-clamp-2 hover:underline"
            >
              {side.name}
            </Link>
          ) : (
            <div className="text-sm font-bold leading-tight line-clamp-2">{side.name}</div>
          )}
          <div className="mt-1 text-lg font-bold tabular-nums leading-none">
            ¥{side.priceYen.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] tabular-nums text-ink-400">
            {unitPriceText(side.priceYen, side.volume, side.volumeUnit) ?? "容量未登録"}
          </div>
        </div>
      </div>
      <div className="mt-1.5 truncate text-[10px] text-ink-400">{side.brand}</div>
      <span className="mt-1 inline-block rounded-full border border-ink-100 bg-white px-2 py-0.5 text-[10px] text-ink-400">
        {side.measured ? `口コミ${side.reviewCount}人の平均` : "成分からの予想"}
      </span>
    </div>
  );
}

function Bar({
  value,
  label,
  tone,
  lead,
}: {
  value: number;
  label: string;
  tone: "high" | "low";
  lead?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <span className={`w-16 shrink-0 text-[11px] font-bold ${lead ? "text-ink-900" : "text-ink-400"}`}>
        {label}
      </span>
      <span className="relative h-4 flex-1 rounded-full bg-ink-100">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${
            tone === "high" ? "bg-brand-500" : "bg-emerald-500"
          } ${lead ? "ring-2 ring-inset ring-white/40" : ""}`}
          style={{ width: `${v}%` }}
        />
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow ${
            tone === "high" ? "bg-brand-500" : "bg-emerald-500"
          }`}
          style={{ left: `${v}%` }}
        />
      </span>
    </div>
  );
}
