import Link from "next/link";
import { unitPriceLabel } from "@/lib/price";
import type { DupeRow } from "@/lib/types";
import { colorMatchBadge, colorName, formulaMatchBadge } from "@/lib/wording";

export default function DupeRowItem({ row, tone }: { row: DupeRow; tone: "warn" | "save" }) {
  const saving = row.savings ?? (row.price_diff !== undefined ? -row.price_diff : 0);
  const hasUnitPrice = row.unit_price_yen !== undefined;
  const unitPrice = unitPriceLabel({
    unit_price_yen: row.unit_price_yen,
    volume_unit: row.volume_unit ?? null,
  });
  const unitPriceSaving = row.unit_price_savings ?? null;

  return (
    <Link
      href={`/products/${row.product_id}`}
      className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 transition "
    >
      <div
        className="swatch h-12 w-12 shrink-0 rounded-2xl"
        style={{ background: row.color_hex ?? "#e9e2e6" }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-ink-400">{row.brand}</div>
        <div className="truncate text-sm font-bold">{row.name}</div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
            {formulaMatchBadge(row.ing_sim)}
          </span>
          {row.delta_e !== null && (
            <span className="rounded-full bg-plum-100 px-2 py-0.5 text-plum-700">
              {colorMatchBadge(row.delta_e)}
            </span>
          )}
          {row.color_hex && (
            <span className="rounded-full bg-white px-2 py-0.5 text-ink-400">
              {colorName(row.color_hex)}
            </span>
          )}
          {unitPriceSaving !== null && (
            <span
              className={`rounded-full px-2 py-0.5 ${
                unitPriceSaving > 0 ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-500"
              }`}
            >
              {unitPriceSaving > 0 ? "単価も安い" : "単価は高い"}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-medium tabular-nums">¥{row.price_yen.toLocaleString()}</div>
        {hasUnitPrice && (
          <div className="text-[11px] tabular-nums text-ink-400">{unitPrice ?? "容量未登録"}</div>
        )}
        {saving > 0 && (
          <div
            className={`text-xs font-bold tabular-nums ${tone === "save" ? "text-emerald-600" : "text-ink-400"}`}
          >
            −¥{saving.toLocaleString()}
          </div>
        )}
      </div>
    </Link>
  );
}
