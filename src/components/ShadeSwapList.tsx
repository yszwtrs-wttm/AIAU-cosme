import Link from "next/link";
import { deltaELabel } from "@/lib/color";
import type { CheaperShadeSwap } from "@/lib/types";
import { colorName } from "@/lib/wording";

/** ポーチの色ごとに「同じ色なのに安い商品」を並べる。根拠として ΔE と価格差を必ず出す。 */
export default function ShadeSwapList({ swaps }: { swaps: CheaperShadeSwap[] }) {
  if (swaps.length === 0) return null;

  const total = swaps.reduce((sum, swap) => sum + swap.savings, 0);

  return (
    <div className="space-y-2 rounded-2xl border border-ink-200 bg-white p-4">
      <p className="text-sm">
        <span className="text-lg font-bold tabular-nums">¥{total.toLocaleString()}</span>
        <span className="ml-2 text-ink-600">
          ぶんは、同じ色で安い商品に置き換えられます（買い足すときの参考）
        </span>
      </p>
      <ul className="space-y-2">
        {swaps.map((swap) => (
          <li key={`${swap.mine_product_id}-${swap.mine_pos}`}>
            <Link
              href={`/shades/${swap.mine_product_id}/${swap.mine_pos}`}
              className="block rounded-xl bg-ink-50 p-3 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="swatch inline-block h-6 w-6 shrink-0 rounded-full"
                  style={{ background: swap.mine_hex }}
                />
                <span className="min-w-0 flex-1 truncate">
                  {swap.mine_label} / {swap.mine_shade}
                  <span className="ml-1 text-ink-400">{colorName(swap.mine_hex)}</span>
                </span>
                <span className="shrink-0 tabular-nums text-ink-400">
                  ¥{swap.mine_price.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-ink-200 pt-2">
                <span
                  className="swatch inline-block h-6 w-6 shrink-0 rounded-full"
                  style={{ background: swap.shade_hex }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {swap.brand} {swap.name} / {swap.shade_name}
                  </span>
                  <span className="text-ink-500 tabular-nums">
                    ΔE {swap.delta_e.toFixed(1)}・{deltaELabel(swap.delta_e)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block tabular-nums">¥{swap.price_yen.toLocaleString()}</span>
                  <span className="block font-bold tabular-nums text-emerald-600">
                    −¥{swap.savings.toLocaleString()}
                  </span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
