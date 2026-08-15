"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
import { updateStashUsage } from "@/app/actions";
import type { Category, RemainingLevel, StashEntry } from "@/lib/types";
import {
  REMAINING_LABEL,
  REMAINING_LEVELS,
  isPlausibleOpenedAt,
  judgeUsage,
  oldestOpenedAt,
} from "@/lib/usage";

/** 残量・開封日・使い切りの登録。ポーチのカードと商品ページの両方から同じものを使う。 */
export default function StashUsage({
  category,
  entry,
}: {
  category: Category;
  entry: StashEntry;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const judgement = judgeUsage(category, entry);
  const finished = Boolean(entry.finished_at);

  const save = (input: Parameters<typeof updateStashUsage>[1]) =>
    startTransition(async () => {
      await updateStashUsage(entry.product_id, input);
      router.refresh();
    });

  return (
    <div className={`space-y-2 rounded-xl p-3 text-xs ${finished ? "bg-ink-50" : "bg-brand-50/60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-600">残量</span>
        <div className="flex gap-1">
          {REMAINING_LEVELS.map((level: RemainingLevel) => (
            <button
              key={level}
              type="button"
              disabled={pending || finished}
              onClick={() => save({ remainingLevel: level })}
              className={`rounded-full px-2.5 py-1 font-bold transition disabled:opacity-50 ${
                entry.remaining_level === level
                  ? "bg-brand-600 text-white"
                  : "border border-ink-200 bg-white text-ink-600"
              }`}
            >
              {REMAINING_LABEL[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-ink-600" htmlFor={`opened-${entry.product_id}`}>
          開封日
        </label>
        <input
          id={`opened-${entry.product_id}`}
          type="date"
          value={entry.opened_at ?? ""}
          disabled={pending}
          min={oldestOpenedAt()}
          max={new Date().toISOString().slice(0, 10)}
          // 日付入力は打ちかけでも onChange が飛ぶ。妥当な日付になるまで保存しない。
          onChange={(e) => {
            const value = e.target.value;
            if (value && !isPlausibleOpenedAt(value)) return;
            save({ openedAt: value || null });
          }}
          className="rounded-lg border border-ink-200 bg-white px-2 py-1 tabular-nums"
        />
        {entry.opened_at && (
          <button
            type="button"
            disabled={pending}
            onClick={() => save({ openedAt: null })}
            className="text-ink-400 underline disabled:opacity-50"
          >
            未開封に戻す
          </button>
        )}
      </div>

      {judgement.note && (
        <p className={`font-bold ${judgement.tone === "warn" ? "text-brand-700" : "text-ink-600"}`}>
          {judgement.note}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => save({ finished: !finished })}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold transition disabled:opacity-50 ${
          finished ? "border border-ink-200 bg-white text-ink-600" : "bg-ink-900 text-white"
        }`}
      >
        {finished ? <RotateCcw size={13} /> : <Check size={13} />}
        {pending ? "処理中…" : finished ? "使いかけに戻す" : "使い切った"}
      </button>
    </div>
  );
}
