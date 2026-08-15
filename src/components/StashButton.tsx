"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart } from "lucide-react";
import { addToStash, removeFromStash } from "@/app/actions";
import { useToast } from "@/components/Toast";
import { japaneseError } from "@/lib/errors";

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
  // 通信を待たせず先に表示を切り替える。失敗すれば owned のまま戻る。
  const [shownOwned, setShownOwned] = useOptimistic(owned);
  const router = useRouter();
  const showToast = useToast();

  if (!canUse) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-ink-0"
      >
        ログインしてポーチに追加
      </Link>
    );
  }

  const toggle = () =>
    startTransition(async () => {
      setShownOwned(!owned);
      const fallback = owned ? "ポーチから外せませんでした" : "ポーチに追加できませんでした";
      try {
        const res = owned
          ? await removeFromStash(productId)
          : await addToStash(productId, source);
        if (!res.ok) {
          showToast(japaneseError(res.error, fallback));
          return;
        }
      } catch (e) {
        showToast(japaneseError(e, fallback));
        return;
      }
      showToast(owned ? "ポーチから外しました" : "ポーチに追加しました", "success");
      router.refresh();
    });

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed ${
        shownOwned ? "border border-brand-200 bg-ink-0 text-brand-600" : "bg-brand-600 text-ink-0"
      }`}
      }`}
    >
      {shownOwned ? <Check size={15} /> : <Heart size={15} />}
      {shownOwned ? "ポーチに入っています" : "ポーチに追加"}
    </button>
  );
}
