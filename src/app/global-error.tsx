"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./globals.css";
import { captureClientError } from "@/lib/sentry-client";

/** ルートレイアウトごと落ちたときの最後の砦。html/body から自前で描く。 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureClientError(error, { where: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="ja">
      <body className="min-h-screen text-ink-900 antialiased">
        <main className="mx-auto max-w-md space-y-5 px-4 py-16 text-center">
          <div>
            <p className="text-xs font-bold tracking-widest text-brand-500">ERROR</p>
            <h1 className="mt-2 font-display text-2xl font-bold">アプリを読み込めませんでした</h1>
            <p className="mt-2 text-sm text-ink-600">
              予期しないエラーが起きました。読み込み直すと元に戻ることがあります。
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white"
            >
              再読み込みする
            </button>
            <Link
              href="/"
              className="rounded-full border border-ink-200 bg-white px-5 py-3 text-sm font-bold"
            >
              トップへ
            </Link>
          </div>
          {error.digest && <p className="text-[11px] text-ink-400">エラーID: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
