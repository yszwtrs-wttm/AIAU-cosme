import Link from "next/link";
import type { DupeRow } from "@/lib/types";
import { colorMatchBadge, colorName, formulaMatchBadge } from "@/lib/wording";

export default function DupeRowItem({ row, tone }: { row: DupeRow; tone: "warn" | "save" }) {
  const saving = row.savings ?? (row.price_diff !== undefined ? -row.price_diff : 0);

  return (
    <Link
      href={`/products/${row.product_id}`}
      className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-0 p-3 transition "
    >
      <div
        className="swatch h-12 w-12 shrink-0 rounded-xl"
        style={{ background: row.color_hex ?? "#e9e2e6" }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-ink-500">{row.brand}</div>
        <div className="truncate text-sm font-bold">{row.name}</div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
            {formulaMatchBadge(row.ing_sim)}
          </span>
          {row.delta_e !== null && (
            <span className="rounded-full bg-clay-100 px-2 py-0.5 text-clay-700">
              {colorMatchBadge(row.delta_e)}
            </span>
          )}
          {row.color_hex && (
            <span className="rounded-full bg-ink-0 px-2 py-0.5 text-ink-500">
              {colorName(row.color_hex)}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-medium tabular-nums">¥{row.price_yen.toLocaleString()}</div>
        {saving > 0 && (
          <div
            className={`font-mono text-xs font-bold tabular-nums ${tone === "save" ? "text-emerald-600" : "text-ink-500"}`}
          >
            −¥{saving.toLocaleString()}
          </div>
        )}
      </div>
    </Link>
  );
}
