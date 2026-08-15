"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { requestProduct } from "@/app/actions";

export default function ProductRequestForm({ defaultKeyword = "" }: { defaultKeyword?: string }) {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className="text-sm text-ink-600">
        リクエストを受け付けました。データベースに追加されたら検索できるようになります。
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await requestProduct({ keyword });
          if (result.ok) setDone(true);
          else setError(result.error ?? "送信できませんでした");
        });
      }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="商品名やブランド名"
          className="min-w-0 flex-1 rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-400"
        />
        <button
          type="submit"
          disabled={pending || keyword.trim().length === 0}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          <Plus size={15} />
          {pending ? "送信中…" : "追加をリクエスト"}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
