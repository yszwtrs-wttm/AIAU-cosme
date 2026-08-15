"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unskipPurchase } from "@/app/skip-actions";

/** 見送りの取り消し。ダッシュボードの一覧から使う。 */
export default function UnskipButton({ productId }: { productId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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
      className="mt-1 text-[11px] font-bold text-ink-400 hover:text-brand-600 disabled:opacity-50"
    >
      {pending ? "処理中…" : "記録を消す"}
    </button>
  );
}
