"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { logMakeup } from "@/app/plan-actions";
import ProductThumb from "@/components/ProductThumb";
import { CATEGORY_LABEL, type MakeupLogEntry, type StashUsage } from "@/lib/types";

/**
 * 「買ったのに使っていない」手持ちと、直近のメイク記録。
 * 使用回数は makeup_logs の記録から user_items に集計されたもの。
 */
export default function UsagePanel({ items, logs }: { items: StashUsage[]; logs: MakeupLogEntry[] }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<number[]>([]);

  const unused = items.filter((i) => i.use_count === 0);
  const used = [...items].filter((i) => i.use_count > 0).sort((a, b) => b.use_count - a.use_count);
  const wasted = unused.reduce((sum, i) => sum + i.products.price_yen, 0);

  const logOne = (productId: number) => {
    startTransition(async () => {
      const res = await logMakeup([productId]);
      if (res.ok) setSaved((prev) => [...prev, productId]);
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
      <div>
        <h2 className="font-display text-lg font-bold">使った記録</h2>
        <p className="mt-1 text-sm text-ink-600">
          記録が溜まるほど、「買ったのに使っていない」ものがはっきりします。次に買わない根拠になります。
        </p>
      </div>

      <div>
        <h3 className="text-sm font-bold">
          まだ使っていない手持ち（{unused.length}点
          {wasted > 0 && <span className="font-normal text-ink-600"> ／ ¥{wasted.toLocaleString()}分</span>}）
        </h3>
        {unused.length === 0 ? (
          <p className="mt-1.5 text-sm text-ink-600">
            {items.length === 0
              ? "手持ちを登録すると、使っているかどうかを追えます。"
              : "手持ちはぜんぶ使えています。"}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {unused.map((i) => (
              <li key={i.product_id} className="flex items-center gap-3">
                <ProductThumb
                  category={i.products.category}
                  colors={[...(i.products.product_colors ?? [])].sort((a, b) => a.pos - b.pos)}
                  imageUrl={i.products.image_url}
                  size={40}
                  className="rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-ink-400">
                    {i.products.brands?.name} ／ {CATEGORY_LABEL[i.products.category]}
                  </div>
                  <Link href={`/products/${i.products.id}`} className="block truncate text-sm font-bold">
                    {i.products.name}
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => logOne(i.product_id)}
                  disabled={pending || saved.includes(i.product_id)}
                  className="shrink-0 rounded-full border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-600 disabled:opacity-50"
                >
                  {saved.includes(i.product_id) ? "記録しました" : "使った"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {used.length > 0 && (
        <div>
          <h3 className="text-sm font-bold">よく使っている手持ち</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {used.slice(0, 5).map((i) => (
              <li key={i.product_id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {i.products.brands?.name} {i.products.name}
                </span>
                <span className="shrink-0 tabular-nums text-ink-600">
                  {i.use_count}回{i.last_used_on && <span className="text-ink-400">／{i.last_used_on}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {logs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold">最近のメイク記録</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {logs.map((log) => (
              <li key={log.id} className="rounded-xl bg-brand-50/60 p-3">
                <div className="flex items-center gap-2 text-[11px] text-ink-500">
                  <Check size={13} className="text-brand-600" />
                  {log.used_on}
                  {log.request && <span className="truncate">「{log.request}」</span>}
                </div>
                <div className="mt-1">
                  {log.makeup_log_items
                    .map((li) => `${li.products?.brands?.name ?? ""} ${li.products?.name ?? ""}`.trim())
                    .join(" ＋ ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
