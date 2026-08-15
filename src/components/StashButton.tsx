"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart } from "lucide-react";
import { addToStash, removeFromStash } from "@/app/actions";

export default function StashButton({
  productId,
  owned,
  source = "manual",
  canUse = true,
}: {
  productId: number;
  owned: boolean;
  source?: "manual" | "scan" | "photo" | "quick";
  canUse?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [overlapLabels, setOverlapLabels] = useState<string[]>([]);
  const router = useRouter();

  if (!canUse) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
      >
        ログインしてポーチに追加
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (owned) {
              await removeFromStash(productId);
              setOverlapLabels([]);
            } else {
              const result = await addToStash(productId, source);
              setOverlapLabels(result.overlapLabels ?? []);
            }
            router.refresh();
          })
        }
        className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
          owned ? "border border-brand-200 bg-white text-brand-600" : "bg-brand-600 text-white"
        }`}
      >
        {owned ? <Check size={15} /> : <Heart size={15} />}
        {pending ? "処理中…" : owned ? "ポーチに入っています" : "ポーチに追加"}
      </button>

      {overlapLabels.length > 0 && (
        <div className="animate-rise rounded-2xl border border-plum-300 bg-plum-100 p-3 text-xs text-plum-700">
          <p className="font-bold">気になるリストと被りました</p>
          <p className="mt-1">
            「{overlapLabels.join("」「")}」は、いま入れたものでほぼ足ります。
          </p>
          <Link href="/wishlist" prefetch className="mt-1 inline-block font-bold underline">
            気になるリストを見る
          </Link>
        </div>
      )}
    </div>
  );
}
