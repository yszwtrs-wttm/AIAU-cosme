"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PiggyBank, X } from "lucide-react";
import { skipPurchase, unskipPurchase } from "@/app/skip-actions";
import { SKIP_REASON_LABEL, type SkipReason } from "@/lib/types";

export type SkipChoice = {
  reason: SkipReason;
  /** 判定の根拠。手持ちの近い商品、または似ていて安い商品 */
  evidenceProductId?: number | null;
  deltaE?: number | null;
  ingSim?: number | null;
  /** 根拠の説明（「ポーチの◯◯とほぼ同じ色」など） */
  detail?: string;
};

/**
 * 「買わない」を記録するボタン。
 * 理由は、この商品で実際に判定できたものだけを候補に出す（根拠のない金額を作らないため）。
 */
export default function SkipButton({
  productId,
  skipped,
  choices,
  canUse = true,
}: {
  productId: number;
  skipped: boolean;
  choices: SkipChoice[];
  canUse?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!canUse) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700"
      >
        <PiggyBank size={15} />
        ログインして見送りを記録
      </Link>
    );
  }

  if (skipped) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await unskipPurchase(productId);
            router.refresh();
          })
        }
        className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-50"
      >
        <PiggyBank size={15} />
        {pending ? "処理中…" : "見送り中（取り消す）"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-ink-300 bg-white px-4 py-2.5 text-sm font-bold text-ink-700"
      >
        {open ? <X size={15} /> : <PiggyBank size={15} />}
        {open ? "やめる" : "買わずに見送る"}
      </button>

      {open && (
        <div className="rounded-2xl border border-ink-200 bg-white p-3">
          <p className="text-xs font-bold text-ink-600">見送る理由を選んでください</p>
          <ul className="mt-2 space-y-1.5">
            {choices.map((choice) => (
              <li key={choice.reason}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await skipPurchase({
                        productId,
                        reason: choice.reason,
                        evidenceProductId: choice.evidenceProductId ?? null,
                        deltaE: choice.deltaE ?? null,
                        ingSim: choice.ingSim ?? null,
                      });
                      setOpen(false);
                      router.refresh();
                    })
                  }
                  className="w-full rounded-xl border border-ink-200 px-3 py-2 text-left text-sm hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                >
                  <span className="font-bold">{SKIP_REASON_LABEL[choice.reason]}</span>
                  {choice.detail && (
                    <span className="mt-0.5 block text-xs text-ink-400">{choice.detail}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
