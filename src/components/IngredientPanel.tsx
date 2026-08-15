import { AlertTriangle, FlaskConical } from "lucide-react";
import {
  ROLE_LABEL,
  groupByRole,
  resolveIngredients,
  summarizeIngredients,
} from "@/lib/ingredients";

/** 英語の全成分表示をそのまま出さず、要約 → 役割別 → 原文の順に見せる。 */
export default function IngredientPanel({ ingredients }: { ingredients: string[] }) {
  const resolved = resolveIngredients(ingredients);
  const groups = groupByRole(resolved);
  const cautions = resolved.filter((x) => x.caution);

  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-brand-soft p-4 shadow-card">
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700">
          <FlaskConical size={14} /> この商品は何でできている？
        </div>
        <p className="mt-1.5 text-sm leading-relaxed">{summarizeIngredients(resolved)}</p>
      </div>

      {cautions.length > 0 && (
        <ul className="space-y-1 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          {cautions.map((c) => (
            <li key={c.inci} className="flex gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                <b>{c.ja}</b>：{c.caution}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.role} className="rounded-3xl border border-white bg-white/90 p-4 shadow-card">
            <div className="text-xs font-bold text-brand-600">{ROLE_LABEL[g.role]}</div>
            <ul className="mt-2 space-y-2">
              {g.items.map((item) => (
                <li key={item.inci} className="text-sm">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-bold">{item.ja}</span>
                    {item.known && <span className="text-[10px] text-ink-400">{item.inci}</span>}
                    {item.pos <= 3 && (
                      <span className="rounded-full bg-brand-50 px-1.5 text-[10px] text-brand-600">
                        多く入っています
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-ink-600">{item.effect}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <details className="rounded-3xl border border-white bg-white/70 p-4">
        <summary className="cursor-pointer text-xs text-ink-400">
          全成分の原文（配合量の多い順）を見る
        </summary>
        <ol className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-ink-600">
          {resolved.map((item) => (
            <li key={item.inci} className="rounded-full bg-white px-2 py-0.5">
              <span className="text-ink-400">{item.pos}.</span> {item.inci}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
