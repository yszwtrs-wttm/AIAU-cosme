import Link from "next/link";
import type { FeelAxis, FeelValues } from "@/lib/feel";
import { axisDiffs, ingredientEdge, ingredientEdgeText } from "@/lib/compare";

export type CompareSide = {
  productId: number;
  brand: string;
  name: string;
  priceYen: number;
  feel: FeelValues;
  ingredients: string[];
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
  const highEdge = ingredientEdgeText(ingredientEdge(high.ingredients, low.ingredients));
  const lowEdge = ingredientEdgeText(ingredientEdge(low.ingredients, high.ingredients));
  const priceDiff = high.priceYen - low.priceYen;
  const estimated = !high.measured || !low.measured;

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-brand-500 bg-white">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 bg-brand-50 p-4">
        <SideHead side={high} caption="この商品" />
        <div className="flex flex-col items-center justify-center gap-1 px-1">
          <span className="text-[11px] font-bold text-ink-400">VS</span>
          {priceDiff > 0 && (
            <span className="rounded-full bg-emerald-600 px-2 py-1 text-center text-[11px] font-bold leading-tight text-white">
              安い方が
              <br />
              ¥{priceDiff.toLocaleString()}安い
            </span>
          )}
        </div>
        <SideHead side={low} caption="似ていて安い方" href={`/products/${low.productId}`} align="right" />
      </div>

      <ul className="divide-y divide-ink-100">
        {diffs.map(({ axis, high: h, low: l, diff }) => {
          const lead = Math.abs(diff) >= 12 ? (diff > 0 ? "high" : "low") : null;
          return (
            <li key={axis.key} className="px-4 py-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold">{axis.label}</span>
                <span className="text-ink-400">
                  {axis.low} → {axis.high}
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                <Bar value={h} label="この商品" tone="high" lead={lead === "high"} />
                <Bar value={l} label="安い方" tone="low" lead={lead === "low"} />
              </div>
              <div className="mt-1.5 text-right text-[11px] font-bold">
                {lead === null ? (
                  <span className="text-ink-400">ほぼ同じ</span>
                ) : (
                  <span className={lead === "high" ? "text-brand-700" : "text-emerald-700"}>
                    {lead === "high" ? "この商品" : "安い方"}が{axis.high}寄り
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-3 border-t border-ink-100 p-4 sm:grid-cols-2">
        <div className="rounded-xl bg-brand-50 p-3 text-xs leading-relaxed">
          <div className="font-bold">この商品にしかないもの</div>
          {highEdge.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {highEdge.map((t) => (
                <li key={t}>・{t}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-ink-400">成分の面では、安い方にない特徴は見つかりませんでした</p>
          )}
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed">
          <div className="font-bold">安い方にしかないもの</div>
          {lowEdge.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {lowEdge.map((t) => (
                <li key={t}>・{t}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-ink-400">成分の面では、この商品にない特徴は見つかりませんでした</p>
          )}
        </div>
        <p className="text-[11px] text-ink-400 sm:col-span-2">
          {estimated
            ? "使い心地は、口コミがまだ少ないため成分からの予想を含みます。"
            : "使い心地は、使った人の口コミの平均です。"}
        </p>
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
      <div className="text-[11px] text-ink-400">{caption}</div>
      <div className="truncate text-[11px] text-ink-400">{side.brand}</div>
      {href ? (
        <Link href={href} className="block text-sm font-bold leading-tight hover:underline">
          {side.name}
        </Link>
      ) : (
        <div className="text-sm font-bold leading-tight">{side.name}</div>
      )}
      <div className="text-lg font-bold tabular-nums">¥{side.priceYen.toLocaleString()}</div>
      <span className="mt-1 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] text-ink-600">
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
      <span className={`w-16 shrink-0 text-[10px] ${lead ? "font-bold text-ink-900" : "text-ink-400"}`}>
        {label}
      </span>
      <span className="relative h-2.5 flex-1 rounded-full bg-ink-100">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${
            tone === "high" ? "bg-brand-500" : "bg-emerald-500"
          } ${lead ? "" : "opacity-60"}`}
          style={{ width: `${v}%` }}
        />
      </span>
    </div>
  );
}
