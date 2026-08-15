"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unskipPurchase } from "@/app/skip-actions";

/** 見送りの取り消し。ダッシュボードの一覧から使う。 */
export default function UnskipButton({ productId }: { productId: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await unskipPurchase(productId);
            setError(result.ok ? null : (result.error ?? "取り消せませんでした"));
            router.refresh();
          })
        }
        className="mt-1 text-[11px] font-bold text-ink-400 hover:text-brand-600 disabled:opacity-50"
      >
        {pending ? "処理中…" : "記録を消す"}
      </button>
      {error && <p className="text-[10px] text-rose-700">{error}</p>}
    </>
  );
}
