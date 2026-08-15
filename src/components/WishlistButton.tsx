"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { addToWishlist, removeFromWishlist } from "@/app/actions";

/**
 * 「今は買わないけれど気になる」を保留しておくボタン。
 * ここに入れておけば、手持ちが増えたときに被りを、値下がりしたときに値段を通知する。
 */
export default function WishlistButton({
  productId,
  wished,
  canUse = true,
}: {
  productId: number;
  wished: boolean;
  canUse?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!canUse) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-600"
      >
        <Bookmark size={15} />
        ログインして気になるに追加
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await (wished ? removeFromWishlist(productId) : addToWishlist(productId));
          router.refresh();
        })
      }
      className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
        wished
          ? "border-plum-300 bg-plum-100 text-plum-700"
          : "border-ink-200 bg-white text-ink-600"
      }`}
    >
      {wished ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
      {pending ? "処理中…" : wished ? "気になるに入っています" : "気になるに追加"}
    </button>
  );
}
