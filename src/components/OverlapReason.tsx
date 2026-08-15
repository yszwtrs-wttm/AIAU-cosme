import type { IngredientOverlap } from "@/lib/overlap";

/**
 * 「なぜ似ているのか」の根拠。3秒で読める一行と共通成分の上位だけを出し、
 * 寄与度の内訳と差分の全部は折りたたみに入れて普段の画面を簡潔に保つ。
 */
export default function OverlapReason({
  overlap,
  baseLabel,
  otherLabel,
}: {
  overlap: IngredientOverlap;
  /** この商品の呼び方 */
  baseLabel: string;
  /** 比べている相手の呼び方 */
  otherLabel: string;
}) {
  if (overlap.sharedCount === 0) return null;

  const core = overlap.shared.slice(0, Math.max(3, overlap.coreCount));
  const headline = core.slice(0, 3).map((item) => item.ja);

  return (
    <details className="group rounded-2xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-xs">
      <summary className="cursor-pointer list-none">
        <span className="font-bold text-ink-900">
          {headline.join("・")}
          {core.length > 3 && `ほか${core.length - 3}成分`}が共通
        </span>
        <span className="ml-1.5 text-ink-600">
          （{overlap.unionCount}成分中{overlap.sharedCount}成分が同じ）。{overlap.differenceText}
        </span>
        <span className="ml-1.5 whitespace-nowrap font-bold text-brand-600 group-open:hidden">
          内訳を見る
        </span>
      </summary>

      <div className="mt-3 space-y-3">
        <ul className="space-y-1.5">
          {core.map((item) => (
            <li key={item.inci} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate font-bold text-ink-900 sm:w-44" title={item.inci}>
                {item.ja}
              </span>
              <span className="relative h-2 flex-1 rounded-full bg-white">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                  style={{ width: `${Math.round(item.share * 100)}%` }}
                />
              </span>
              <span className="w-9 shrink-0 text-right tabular-nums text-ink-400">
                {Math.round(item.share * 100)}%
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] leading-relaxed text-ink-400">
          割合は「似ている」と判定した理由のうち、その成分が占める分です。配合量の多い順の重みと、
          どの商品にも入っている成分ほど軽くする重みから出しています。
        </p>

        <DiffList label={`${baseLabel}だけに入っている成分`} items={overlap.onlyBase} />
        <DiffList label={`${otherLabel}だけに入っている成分`} items={overlap.onlyOther} />
      </div>
    </details>
  );
}

function DiffList({ label, items }: { label: string; items: { inci: string; ja: string }[] }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-ink-600">{label}</div>
      {items.length === 0 ? (
        <p className="mt-1 text-[11px] text-ink-400">ありません</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1">
          {items.map((item) => (
            <li key={item.inci} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-ink-600">
              {item.ja}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
