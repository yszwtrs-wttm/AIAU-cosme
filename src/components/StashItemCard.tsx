"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateStashUsage } from "@/app/actions";
import ProductThumb from "@/components/ProductThumb";
import {
  REMAINING_LEVELS,
  SHELF_LIFE_MONTHS,
  USE_UP_BADGE,
  USE_UP_TONE,
  remainingLabel,
  toRemainingLevel,
  judgeUseUp,
  type StashUsage,
} from "@/lib/shelf-life";
import { CATEGORY_LABEL, type Product } from "@/lib/types";

export type StashItem = StashUsage & { product: Product };

/** 手持ち1点。開封日・購入日・購入価格・残量・メモをその場で編集できる。 */
export default function StashItemCard({ item }: { item: StashItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(item.opened_at ?? "");
  const [purchasedAt, setPurchasedAt] = useState(item.purchased_at ?? "");
  const [price, setPrice] = useState(
    item.purchase_price_yen === null ? "" : String(item.purchase_price_yen),
  );
  const [remaining, setRemaining] = useState(toRemainingLevel(item.remaining_pct));
  const [note, setNote] = useState(item.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const status = judgeUseUp(item.product.category, {
    ...item,
    opened_at: openedAt || null,
    remaining_pct: remaining,
  });

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await updateStashUsage({
        productId: item.product.id,
        openedAt: openedAt || null,
        purchasedAt: purchasedAt || null,
        purchasePriceYen: price === "" ? null : Number(price),
        remainingPct: remaining,
        note,
      });
      if (!res.ok) {
        setError(res.error ?? "保存できませんでした");
        return;
      }
      setOpen(false);
      router.refresh();
    });

  return (
    <div className={`rounded-2xl border p-3 ${USE_UP_TONE[status.state]}`}>
      <div className="flex gap-3">
        <Link href={`/products/${item.product.id}`} className="shrink-0">
          <ProductThumb
            category={item.product.category}
            colors={item.product.product_colors ?? []}
            imageUrl={item.product.image_url}
            size={64}
            className="rounded-2xl"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
            <span className="truncate">{item.product.brands?.name}</span>
            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-brand-600">
              {CATEGORY_LABEL[item.product.category]}
            </span>
          </div>
          <Link href={`/products/${item.product.id}`} className="block truncate text-sm font-bold text-ink-900">
            {item.product.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-full border border-current px-2 py-0.5 font-bold">
              {USE_UP_BADGE[status.state]}
            </span>
            <span className="text-ink-600">残り{remainingLabel(remaining)}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed">{status.label}</p>
          {item.note && <p className="mt-1 truncate text-[11px] text-ink-400">メモ: {item.note}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 w-full rounded-full border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-600"
      >
        {open ? "閉じる" : "開封日・残量を記録"}
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-2xl bg-white p-3">
          <label className="block text-xs font-bold text-ink-600">
            開封日
            <input
              type="date"
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm font-normal"
            />
          </label>
          <p className="text-[11px] text-ink-400">
            {CATEGORY_LABEL[item.product.category]}の目安は開封後
            {SHELF_LIFE_MONTHS[item.product.category]}か月です。
          </p>

          <div className="text-xs font-bold text-ink-600">
            残量
            <div className="mt-1 flex gap-1.5">
              {REMAINING_LEVELS.map((level) => (
                <button
                  key={level.pct}
                  type="button"
                  onClick={() => setRemaining(level.pct)}
                  className={`flex-1 rounded-full border px-2 py-2 text-xs font-bold ${
                    remaining === level.pct
                      ? "border-brand-400 bg-brand-50 text-brand-600"
                      : "border-ink-200 bg-white text-ink-600"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <label className="flex-1 text-xs font-bold text-ink-600">
              購入日
              <input
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="w-28 text-xs font-bold text-ink-600">
              購入価格
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={1000000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="円"
                className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm font-normal tabular-nums"
              />
            </label>
          </div>

          <label className="block text-xs font-bold text-ink-600">
            メモ
            <input
              type="text"
              value={note}
              maxLength={140}
              onChange={(e) => setNote(e.target.value)}
              placeholder="色番・使う場面など"
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm font-normal"
            />
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {pending ? "保存中…" : "保存"}
          </button>
        </div>
      )}
    </div>
  );
}
