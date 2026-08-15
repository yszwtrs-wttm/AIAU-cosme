"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw, Search } from "lucide-react";

/** サーバー側の例外で白画面になると事故がそのまま見えるので、再試行できる画面を出す。 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="animate-rise space-y-5 py-10 text-center">
      <div>
        <p className="font-mono text-xs font-semibold tracking-widest text-brand-600">ERROR</p>
        <h1 className="mt-2 font-display text-2xl font-bold">うまく読み込めませんでした</h1>
        <p className="mt-2 text-sm text-ink-600">
          通信かサーバーの調子が一時的に悪いようです。もう一度お試しください。
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-ink-0"
        >
          <RefreshCw size={16} />
          再試行する
        </button>
        <Link
          href="/search"
          className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-0 px-5 py-3 text-sm font-bold"
        >
          <Search size={16} />
          商品を探す
        </Link>
      </div>
      {error.digest && <p className="text-[11px] text-ink-500">エラーID: {error.digest}</p>}
    </section>
  );
}
