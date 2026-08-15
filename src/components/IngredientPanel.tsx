"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import IngredientDisclaimer from "@/components/IngredientDisclaimer";
import {
  ROLE_LABEL,
  ROLE_SHORT_LABEL,
  type ResolvedIngredient,
  groupByRole,
  resolveIngredients,
  sourcesOf,
  summarizeIngredientPoints,
} from "@/lib/ingredients";

/**
 * 英語の全成分表示をそのまま出さず、要約 → 役割別 → 原文の順に見せる。
 * 細かい成分は長くなるので、役割ごとのタブ（+ 全成分の原文）で切り替える。
 * 成分名を開くと、なぜ避けたい人がいるのかと出典まで読める。
 */
export default function IngredientPanel({ ingredients }: { ingredients: string[] }) {
  const resolved = resolveIngredients(ingredients);
  const groups = groupByRole(resolved);
  const cautions = resolved.filter((x) => x.caution);

  const [active, setActive] = useState<string>(groups[0]?.role ?? "raw");
  const current = groups.find((g) => g.role === active);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-brand-300 bg-white p-4">
        <ul className="space-y-1 text-sm leading-relaxed">
          {summarizeIngredientPoints(resolved).map((point) => (
            <li key={point} className="flex gap-1.5">
              <span className="text-brand-600">・</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {cautions.length > 0 && (
        <ul className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
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

      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-ink-100 p-2">
          {groups.map((g) => (
            <TabButton
              key={g.role}
              id={g.role}
              active={active === g.role}
              onSelect={setActive}
              label={ROLE_SHORT_LABEL[g.role]}
              count={g.items.length}
            />
          ))}
          <TabButton id="raw" active={active === "raw"} onSelect={setActive} label="全成分" />
        </div>

        {current ? (
          <div role="tabpanel" className="p-4">
            <div className="text-xs font-bold text-brand-600">{ROLE_LABEL[current.role]}</div>
            <ul className="mt-2 space-y-2">
              {current.items.map((item) => (
                <IngredientRow key={item.inci} item={item} />
              ))}
            </ul>
          </div>
        ) : (
          <div role="tabpanel" className="p-4">
            <div className="text-xs text-ink-400">全成分の原文（配合量の多い順）</div>
            <ol className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-ink-600">
              {resolved.map((item) => (
                <li key={item.inci} className="rounded-full bg-ink-50 px-2 py-0.5">
                  <span className="text-ink-400">{item.pos}.</span> {item.inci}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <IngredientDisclaimer sources={sourcesOf(resolved)} />
    </div>
  );
}

/** 1 成分。見出しと一言説明は常に見えて、詳しい話と出典は開いたときだけ見せる。 */
function IngredientRow({ item }: { item: ResolvedIngredient }) {
  const hasDetail = Boolean(item.avoid || item.caution || item.sources.length > 0);

  return (
    <li className="text-sm">
      <details className="group">
        <summary
          className={`flex list-none items-start gap-1.5 [&::-webkit-details-marker]:hidden ${
            hasDetail ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-bold">{item.ja}</span>
              {item.known && <span className="text-[10px] text-ink-400">{item.inci}</span>}
              {item.pos <= 3 && (
                <span className="rounded-full bg-brand-50 px-1.5 text-[10px] text-brand-600">
                  多く入っています
                </span>
              )}
              {item.avoid && (
                <span className="rounded-full bg-amber-50 px-1.5 text-[10px] text-amber-800">
                  避ける人がいる成分
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-ink-600">{item.effect}</p>
          </div>
          {hasDetail && (
            <ChevronDown
              size={14}
              className="mt-1 shrink-0 text-ink-400 transition group-open:rotate-180"
            />
          )}
        </summary>

        {hasDetail && (
          <div className="mt-1.5 space-y-1.5 rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-600">
            <p>
              <span className="font-bold text-ink-900">役割</span>：{ROLE_LABEL[item.role]}
            </p>
            {item.avoid && (
              <p>
                <span className="font-bold text-ink-900">なぜ避けたい人がいるのか</span>：{item.avoid}
              </p>
            )}
            {item.caution && (
              <p>
                <span className="font-bold text-ink-900">気にする人向け</span>：{item.caution}
              </p>
            )}
            {item.sources.length > 0 && (
              <p className="text-[11px] text-ink-400">
                出典：
                {item.sources.map((source, i) => (
                  <span key={source.id}>
                    {i > 0 && "、"}
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-brand-700"
                    >
                      {source.name}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
      </details>
    </li>
  );
}

function TabButton({
  id,
  label,
  count,
  active,
  onSelect,
}: {
  id: string;
  label: string;
  count?: number;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(id)}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-600 hover:bg-ink-100"
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1 font-normal opacity-70">{count}</span>}
    </button>
  );
}
