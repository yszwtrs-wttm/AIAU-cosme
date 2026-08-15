import Link from "next/link";
import { deltaELabel } from "@/lib/color";
import type { DupeRow } from "@/lib/types";

export default function DupeRowItem({ row, tone }: { row: DupeRow; tone: "warn" | "save" }) {
  const saving = row.savings ?? (row.price_diff !== undefined ? -row.price_diff : 0);

  return (
    <Link
      href={`/products/${row.product_id}`}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 hover:border-neutral-400"
    >
      <div
        className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200"
        style={{ background: row.color_hex ?? "#e5e5e5" }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-neutral-500">{row.brand}</div>
        <div className="truncate text-sm font-medium">{row.name}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-600">
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 tabular-nums">
            成分類似度 {(row.ing_sim * 100).toFixed(1)}%
          </span>
          {row.delta_e !== null && (
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 tabular-nums">
              ΔE {row.delta_e.toFixed(2)}・{deltaELabel(row.delta_e)}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm tabular-nums">¥{row.price_yen.toLocaleString()}</div>
        {saving > 0 && (
          <div className={`text-xs tabular-nums ${tone === "save" ? "text-emerald-600" : "text-neutral-500"}`}>
            −¥{saving.toLocaleString()}
          </div>
        )}
      </div>
    </Link>
  );
}
