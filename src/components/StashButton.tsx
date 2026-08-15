"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToStash, removeFromStash } from "@/app/actions";

export default function StashButton({ productId, owned }: { productId: number; owned: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await (owned ? removeFromStash(productId) : addToStash(productId));
          router.refresh();
        })
      }
      className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
        owned ? "border border-neutral-300 bg-white" : "bg-neutral-900 text-white"
      }`}
    >
      {pending ? "処理中…" : owned ? "手持ちから外す" : "手持ちに追加"}
    </button>
  );
}
