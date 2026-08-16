"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unskipPurchase } from "@/app/skip-actions";
import { useToast } from "@/components/Toast";
import { japaneseError } from "@/lib/errors";

/** 見送りの取り消し。ダッシュボードの一覧から使う。 */
export default function UnskipButton({ productId }: { productId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const showToast = useToast();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await unskipPurchase(productId);
          if (!result.ok) {
            showToast(japaneseError(result.error, "取り消せませんでした"));
            return;
          }
          showToast("見送りの記録を消しました", "success");
          router.refresh();
        })
      }
      className="mt-1 text-[11px] font-bold text-ink-400 hover:text-brand-600 disabled:opacity-50"
    >
      {pending ? "処理中…" : "記録を消す"}
    </button>
  );
}
