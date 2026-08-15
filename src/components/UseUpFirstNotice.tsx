import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import { USE_UP_BADGE, judgeUseUp, remainingLabel, type StashUsage } from "@/lib/shelf-life";
import type { Product } from "@/lib/types";

export type UseUpItem = StashUsage & { product: Product };

/**
 * 「買う前に、期限が近い手持ちを先に使い切る」提案。
 * 商品ページでは同じカテゴリの手持ちだけを出す。
 */
export default function UseUpFirstNotice({
  items,
  title,
  description,
}: {
  items: UseUpItem[];
  title: string;
  description: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-display text-base font-bold text-amber-800">{title}</h2>
      <p className="text-xs leading-relaxed text-amber-700">{description}</p>
      <ul className="space-y-2">
        {items.map((item) => {
          const status = judgeUseUp(item.product.category, item);
          return (
            <li key={item.product.id}>
              <Link
                href={`/products/${item.product.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-2.5"
              >
                <ProductThumb
                  category={item.product.category}
                  colors={item.product.product_colors ?? []}
                  imageUrl={item.product.image_url}
                  size={40}
                  className="rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-ink-400">{item.product.brands?.name}</span>
                  {/* line-clamp は display を上書きするので block と併用しない */}
                  <span className="line-clamp-2 text-sm font-bold">{item.product.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-600">
                    <span className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      {USE_UP_BADGE[status.state]}
                    </span>
                    <span>
                      {status.label}・残り{remainingLabel(item.remaining_pct)}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
