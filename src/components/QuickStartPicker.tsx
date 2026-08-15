"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { addManyToStash } from "@/app/actions";
import ProductThumb from "@/components/ProductThumb";
import { japaneseError } from "@/lib/errors";
import { CATEGORY_LABEL, type Category, type Product } from "@/lib/types";

/**
 * バーコードを1本ずつ読む代わりに、よく使われている商品から
 * 持っているものをタップで選んで、まとめて登録する。
 */
export default function QuickStartPicker({ products }: { products: Product[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = products.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <details className="rounded-xl border border-ink-200 bg-ink-0">
      <summary className="cursor-pointer px-5 py-4 font-display text-lg font-bold">
        リストから選んで登録
      </summary>
      <div className="space-y-4 border-t border-ink-100 p-5">
        <div>
          <p className="text-sm text-ink-600">
            よく使われている商品を並べています。当てはまるものを選んで、まとめて登録できます。
          </p>
        </div>

        {Object.entries(groups).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <div className="font-mono text-xs font-semibold text-brand-600">
              {CATEGORY_LABEL[category as Category]}
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((p) => {
                const on = selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs ${
                      on ? "border-brand-400 bg-brand-50" : "border-brand-100 bg-ink-0"
                    }`}
                  >
                    <ProductThumb
                      category={p.category}
                      colors={p.product_colors ?? []}
                      imageUrl={p.image_url}
                      size={28}
                      className="rounded-xl"
                    />
                    <span className="min-w-0">
                      <span className="block text-[10px] text-ink-500">{p.brands?.name}</span>
                      <span className="block max-w-40 truncate font-bold">{p.name}</span>
                    </span>
                    {on && <Check size={14} className="text-brand-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="button"
          disabled={selected.length === 0 || pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                const res = await addManyToStash(selected, "quick");
                if (!res.ok) {
                  setError(japaneseError(res.error, "登録できませんでした"));
                  return;
                }
              } catch (e) {
                setError(japaneseError(e, "登録できませんでした"));
                return;
              }
              router.push("/stash");
              router.refresh();
            })
          }
          className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-ink-0 disabled:opacity-40"
        >
          {pending ? "登録中…" : "追加"}
        </button>
      </div>
    </details>
  );
}
