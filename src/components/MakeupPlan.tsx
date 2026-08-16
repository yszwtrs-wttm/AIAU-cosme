"use client";

import { useState, useTransition } from "react";
import { generateMakeupPlan } from "@/app/plan-actions";
import type { Plan } from "@/lib/makeup";
import type { Product } from "@/lib/types";

const PRESETS = ["清楚に見せたい", "華やかにしたい", "ナチュラルにまとめたい", "大人っぽくしたい"];

export default function MakeupPlan({ products }: { products: Product[] }) {
  const [request, setRequest] = useState(PRESETS[0]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (text: string) => {
    setRequest(text);
    startTransition(async () => setPlan(await generateMakeupPlan(text)));
  };

  return (
    <section className="space-y-3 rounded-xl border border-ink-200 bg-ink-0 p-4">
      <h2 className="text-base font-bold">今日のメイクを、手持ちだけで組む</h2>
      <p className="text-xs text-ink-500">
        候補は手持ち<span className="font-mono tabular-nums">{products.length}</span>点に限定されます。買い足しは提案しません。
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => run(p)}
            className={`rounded-full border px-3 py-1 text-sm ${request === p ? "border-ink-900 bg-ink-900 text-ink-0" : "border-ink-200"}`}
          >
            {p}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(request);
        }}
      >
        <input
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm"
          placeholder="今日はこういうメイクがしたい"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-ink-900 px-3 py-2 text-sm text-ink-0 disabled:opacity-50"
        >
          {pending ? "考え中…" : "組む"}
        </button>
      </form>

      {plan && (
        <div className="space-y-2 rounded-xl bg-ink-50 p-3">
          <div className="font-medium">{plan.headline}</div>
          <ol className="space-y-1 text-sm">
            {plan.steps.map((s) => (
              <li key={s.order}>
                <b>{s.order}. {s.product}</b>
                <span className="text-ink-600"> — {s.reason}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-emerald-700">{plan.note}</p>
          <p className="text-xs text-ink-500">
            生成: {plan.source === "llm" ? "LLM" : "ルールベース（OPENAI_API_KEY 未設定時のフォールバック）"}
          </p>
        </div>
      )}
    </section>
  );
}
