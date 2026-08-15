"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Share2, Undo2 } from "lucide-react";
import { recordPass, removePass } from "@/app/actions";

/**
 * 「買わない」を記録するボタン。
 * 買ったものだけが残るアプリにしないために、見送った判断も同じ重さで残せるようにする。
 */
export default function PassButton({
  productId,
  shareId,
  canUse = true,
}: {
  productId: number;
  shareId: string | null;
  canUse?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!canUse) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-600"
      >
        ログインして見送りを記録
      </Link>
    );
  }

  if (shareId) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/pass/${shareId}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Share2 size={15} />
          見送り記録をシェアする
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await removePass(productId);
              if (!res.ok) setError(res.error ?? "取り消せませんでした");
              router.refresh();
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-600 disabled:opacity-50"
        >
          <Undo2 size={15} />
          {pending ? "処理中…" : "見送りを取り消す"}
        </button>
        {error && <span className="text-xs font-bold text-rose-700">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await recordPass(productId);
            if (!res.ok) {
              setError(res.error ?? "記録できませんでした");
              return;
            }
            setError(null);
            if (res.shareId) router.push(`/pass/${res.shareId}`);
            else router.refresh();
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-600 disabled:opacity-50"
      >
        <Share2 size={15} />
        {pending ? "記録中…" : "見送って記録する"}
      </button>
      {error && <span className="text-xs font-bold text-rose-700">{error}</span>}
    </div>
  );
}
