"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteReview } from "@/app/actions";

/** マイページの「書いた口コミ」から誤投稿を消せるようにする。 */
export default function DeleteReviewButton({ reviewId }: { reviewId: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("この口コミと写真を削除します。元に戻せません。")) return;
          setError(null);
          startTransition(async () => {
            const res = await deleteReview(reviewId);
            if (!res.ok) {
              setError(res.error ?? "削除できませんでした");
              return;
            }
            router.refresh();
          });
        }}
        className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-red-600 disabled:opacity-50"
      >
        <Trash2 size={12} /> {pending ? "削除中…" : "削除"}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </>
  );
}
