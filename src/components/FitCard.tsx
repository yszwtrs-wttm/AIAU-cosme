import Link from "next/link";
import { Check, CircleAlert, HelpCircle } from "lucide-react";
import type { Fit } from "@/lib/fit";

const TONE: Record<Fit["verdict"], { box: string; text: string }> = {
  good: { box: "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-900 dark:text-emerald-100" },
  caution: { box: "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40", text: "text-amber-900 dark:text-amber-100" },
  unknown: { box: "border-ink-200 bg-surface", text: "text-ink-900" },
};

const ICON = {
  good: Check,
  caution: CircleAlert,
  unknown: HelpCircle,
} as const;

/** 商品ページの結論。成分表と色から言えることだけを書く。 */
export default function FitCard({ fit, hasProfile }: { fit: Fit; hasProfile: boolean }) {
  const tone = TONE[fit.verdict];
  const Icon = ICON[fit.verdict];

  return (
    <div className={`rounded-2xl border p-4 ${tone.box}`}>
      <div className={`flex items-center gap-2 text-base font-bold ${tone.text}`}>
        <Icon size={18} />
        {fit.headline}
      </div>

      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-ink-900">
        {fit.reasons.map((r) => (
          <li key={r.text} className="flex gap-1.5">
            <span
              className={
                r.tone === "plus"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : r.tone === "minus"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-ink-400"
              }
            >
              {r.tone === "minus" ? "−" : r.tone === "plus" ? "＋" : "・"}
            </span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>

      {fit.shade && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span
            className="swatch inline-block h-7 w-7 rounded-full"
            style={{ background: fit.shade.hex }}
          />
          <span className="font-bold">{fit.shade.shade_name}</span>
          <span className="text-xs text-ink-400">肌の色にいちばん近い番号</span>
        </div>
      )}

      {!hasProfile && (
        <Link href="/settings" className="mt-3 inline-block text-xs font-bold text-brand-fg">
          肌の状態と肌の色を登録する
        </Link>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        成分表と色から言えることだけを書いています。肌に合うかは人によって違うので、心配な点は必ず現物で確かめてください。
      </p>
    </div>
  );
}
