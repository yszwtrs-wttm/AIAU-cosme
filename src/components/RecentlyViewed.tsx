"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import { readRecentProducts, type RecentProduct } from "@/lib/browsing";

/** 見比べている最中に前の候補へ戻れるよう、最近見た商品を並べる。 */
export default function RecentlyViewed() {
  const [products, setProducts] = useState<RecentProduct[]>([]);

  useEffect(() => {
    setProducts(readRecentProducts());
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold text-ink-400">最近見た商品</h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {products.map((product) => (
          <li key={product.id} className="w-24 shrink-0">
            <Link href={`/products/${product.id}`} className="block">
              <ProductThumb
                category={product.category}
                colors={product.colors ?? []}
                imageUrl={product.imageUrl}
                size={96}
                className="rounded-2xl"
              />
              <div className="mt-1 truncate text-[11px] text-ink-400">{product.brand}</div>
              <div className="truncate text-xs font-bold">{product.name}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
