"use client";

import Link from "next/link";
import "./globals.css";
import { useEffect } from "react";
import { captureClientError } from "@/lib/sentry-client";

/** クライアント側で最後まで捕まらなかった例外を送り、画面には短い日本語だけを出す。 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    captureClientError(error, { where: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="ja">
      <body className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <p className="text-base font-bold">画面を表示できませんでした</p>
          <p className="text-sm text-ink-400">時間をおいて開き直してください。</p>
          <Link href="/" className="inline-block text-sm underline">
            トップに戻る
          </Link>
        </div>
      </body>
    </html>
  );
}
