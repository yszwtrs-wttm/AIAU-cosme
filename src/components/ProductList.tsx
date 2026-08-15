"use client";

import { useState, useTransition } from "react";
import { loadMoreProducts } from "@/app/search/actions";
import ProductCard from "@/components/ProductCard";
import type { ProductQuery, RankedProduct } from "@/lib/products";

/** 初回は 1 ページぶんだけ表示し、「もっと見る」で続きを読む。 */
export default function ProductList({
  initial,
  total,
  query,
}: {
  initial: RankedProduct[];
  total: number;
  query: ProductQuery;
}) {
  const [products, setProducts] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(async () => {
      const page = await loadMoreProducts({ ...query, offset: products.length });
      if (page.error) {
        setError(page.error);
        return;
      }
      setError(null);
      setProducts((prev) => [...prev, ...page.products]);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {products.length < total && (
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="rounded-full border border-ink-200 bg-surface px-5 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {pending ? "読み込み中…" : "もっと見る"}
          </button>
          <p className="text-xs text-ink-400">
            {products.length} / {total}件
          </p>
        </div>
      )}
    </div>
  );
}
