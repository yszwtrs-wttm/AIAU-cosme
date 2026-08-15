"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart } from "lucide-react";
import { addToStash, removeFromStash } from "@/app/actions";

export default function StashButton({
  productId,
  owned,
  source = "manual",
}: {
  productId: number;
  owned: boolean;
  source?: "manual" | "scan" | "photo" | "quick";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await (owned ? removeFromStash(productId) : addToStash(productId, source));
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
  );
}
