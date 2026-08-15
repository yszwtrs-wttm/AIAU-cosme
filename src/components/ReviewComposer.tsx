"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Search } from "lucide-react";
import ProductThumb from "@/components/ProductThumb";
import ReviewForm from "@/components/ReviewForm";
import type { Product } from "@/lib/types";

type Candidate = { product: Product; owned: boolean };

/**
 * フィードからの投稿。商品を選んでから、商品詳細と同じ入力フォームを開く。
 * ポーチに入れている商品を先頭に出す（実際に使っている人の口コミが多いはず）。
 */
export default function ReviewComposer({
  candidates,
  initialProductId,
}: {
  candidates: Candidate[];
  initialProductId?: number;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(initialProductId ?? null);
  const [query, setQuery] = useState("");

  const selected = candidates.find((c) => c.product.id === selectedId)?.product ?? null;

  const q = query.trim().toLowerCase();
  const matched = q
    ? candidates.filter((c) =>
        `${c.product.brands?.name ?? ""} ${c.product.name}`.toLowerCase().includes(q),
      )
    : candidates;
  const owned = matched.filter((c) => c.owned);
  const others = matched.filter((c) => !c.owned);

  if (selected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-3">
          <ProductThumb
            category={selected.category}
            colors={selected.product_colors ?? []}
            imageUrl={selected.image_url}
            size={40}
            className="rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-ink-400">{selected.brands?.name}</div>
            <div className="truncate text-sm font-bold">{selected.name}</div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="shrink-0 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-600"
          >
            商品を変える
          </button>
        </div>

        <ReviewForm
          productId={selected.id}
          category={selected.category}
          title="この商品の感想を書く"
          onPosted={() => {
            router.push("/feed");
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-2">
        <Search size={15} className="text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="商品名・ブランドで絞り込む"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      {[
        { key: "owned", label: "ポーチの商品", items: owned },
        { key: "others", label: "よく使われている商品", items: others },
      ].map(({ key, label, items }) =>
        items.length === 0 ? null : (
          <section key={key} className="space-y-2">
            <h2 className="text-xs font-bold text-brand-600">{label}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map(({ product, owned: isOwned }) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedId(product.id)}
                  className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-2.5 py-2 text-left text-xs hover:border-brand-300"
                >
                  <ProductThumb
                    category={product.category}
                    colors={product.product_colors ?? []}
                    imageUrl={product.image_url}
                    size={32}
                    className="rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] text-ink-400">{product.brands?.name}</span>
                    <span className="block truncate font-bold">{product.name}</span>
                  </span>
                  {isOwned && <Check size={14} className="shrink-0 text-brand-600" />}
                </button>
              ))}
            </div>
          </section>
        ),
      )}

      {matched.length === 0 && (
        <p className="text-sm text-ink-600">
          見つかりませんでした。
          <Link href="/search" className="ml-1 font-bold text-brand-600">
            商品を探す
          </Link>
          から商品ページを開いても投稿できます。
        </p>
      )}
    </div>
  );
}
