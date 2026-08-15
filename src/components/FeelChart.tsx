import type { FeelAxis, FeelValues } from "@/lib/feel";

/**
 * 使用感のバー。口コミの平均があればそれを、無ければ成分からの推定を出す。
 * どちらなのかを必ず添える（推定を実測に見せない）。
 */
export default function FeelChart({
  axes,
  values,
  reviewCount,
}: {
  axes: FeelAxis[];
  values: FeelValues;
  reviewCount: number;
}) {
  const estimated = reviewCount === 0;

  return (
    <div className="rounded-3xl border border-white bg-white/90 p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold">使い心地</div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] ${
            estimated ? "bg-plum-100 text-plum-700" : "bg-brand-50 text-brand-700"
          }`}
        >
          {estimated ? "成分からの予想（口コミ待ち）" : `使った人${reviewCount}人の平均`}
        </span>
      </div>

      <ul className="mt-3 space-y-3">
        {axes.map((axis) => {
          const v = Math.max(0, Math.min(100, values[axis.key] ?? 50));
          return (
            <li key={axis.key}>
              <div className="flex items-center justify-between text-[11px] text-ink-400">
                <span>{axis.low}</span>
                <span className="font-bold text-ink-900">{axis.label}</span>
                <span>{axis.high}</span>
              </div>
              <div className="relative mt-1 h-2 rounded-full bg-brand-50">
                <div
                  className="h-2 rounded-full bg-brand-gradient"
                  style={{ width: `${v}%` }}
                />
                <span
                  className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-brand-500 shadow-card"
                  style={{ left: `${v}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
