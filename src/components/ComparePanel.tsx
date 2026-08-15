import Link from "next/link";
import type { FeelAxis, FeelValues } from "@/lib/feel";
import { axisDiffs, describeDiffs, ingredientEdge, ingredientEdgeText } from "@/lib/compare";

export type CompareSide = {
  productId: number;
  brand: string;
  name: string;
  priceYen: number;
  feel: FeelValues;
  ingredients: string[];
  /** 口コミの平均が使えているか（推定なら false） */
  measured: boolean;
};

/**
 * 高い方と安い方を並べて、どこが違うのかを見せる。
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
    <div className="rounded-2xl border border-ink-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[11px] text-ink-400">この商品</div>
          <div className="font-bold leading-tight">{high.name}</div>
          <div className="tabular-nums">¥{high.priceYen.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[11px] text-ink-400">似ていて安い方</div>
          <Link href={`/products/${low.productId}`} className="font-bold leading-tight hover:underline">
            {low.name}
          </Link>
          <div className="tabular-nums">
            ¥{low.priceYen.toLocaleString()}
            {priceDiff > 0 && (
              <span className="ml-1 text-xs font-bold text-emerald-700">
                −¥{priceDiff.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {diffs.map(({ axis, high: h, low: l }) => (
          <li key={axis.key}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold">{axis.label}</span>
              <span className="text-ink-400">
                {axis.low} → {axis.high}
              </span>
            </div>
            <div className="mt-1 space-y-1">
              <Bar value={h} label="この商品" strong />
              <Bar value={l} label="安い方" />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm font-bold">{describeDiffs(diffs)}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-ink-50 p-3 text-xs leading-relaxed">
          <div className="font-bold">この商品にあるもの</div>
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
        <div className="rounded-xl bg-ink-50 p-3 text-xs leading-relaxed">
          <div className="font-bold">安い方にあるもの</div>
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
      </div>

      <p className="mt-3 text-[11px] text-ink-400">
        {estimated
          ? "使い心地は、口コミがまだ少ないため成分からの予想を含みます。"
          : "使い心地は、使った人の口コミの平均です。"}
      </p>
    </div>
  );
}

function Bar({ value, label, strong }: { value: number; label: string; strong?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] text-ink-400">{label}</span>
      <span className="relative h-1.5 flex-1 rounded-full bg-ink-100">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${strong ? "bg-brand-500" : "bg-ink-400"}`}
          style={{ width: `${v}%` }}
        />
      </span>
    </div>
  );
}
