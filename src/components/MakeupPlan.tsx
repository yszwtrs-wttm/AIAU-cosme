"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { generateMakeupPlan, logMakeup } from "@/app/plan-actions";
import type { Plan } from "@/lib/makeup";
import type { Product } from "@/lib/types";

const PRESETS = ["清楚に見せたい", "華やかにしたい", "ナチュラルにまとめたい", "大人っぽくしたい"];

export default function MakeupPlan({ products }: { products: Product[] }) {
  const [request, setRequest] = useState(PRESETS[0]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [pending, startTransition] = useTransition();
  const [logState, setLogState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [logError, setLogError] = useState<string | null>(null);

  const run = (text: string) => {
    setRequest(text);
    setLogState("idle");
    setLogError(null);
    startTransition(async () => setPlan(await generateMakeupPlan(text)));
  };

  const planProductIds = plan
    ? [...new Set(plan.steps.map((s) => s.product_id).filter((id): id is number => typeof id === "number"))]
    : [];

  const save = () => {
    setLogState("saving");
    setLogError(null);
    startTransition(async () => {
      const res = await logMakeup(planProductIds, request);
      setLogState(res.ok ? "saved" : "error");
      setLogError(res.error ?? null);
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="text-base font-bold">今日のメイクを、手持ちだけで組む</h2>
      <p className="text-xs text-neutral-500">
        候補は手持ち{products.length}点に限定されます。買い足しは提案しません。
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => run(p)}
            className={`rounded-full border px-3 py-1 text-sm ${request === p ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"}`}
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
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          placeholder="今日はこういうメイクがしたい"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? "考え中…" : "組む"}
        </button>
      </form>

      {plan && (
        <div className="space-y-2 rounded-xl bg-neutral-50 p-3">
          <div className="font-medium">{plan.headline}</div>
          <ol className="space-y-1 text-sm">
            {plan.steps.map((s) => (
              <li key={s.order}>
                <b>{s.order}. {s.product}</b>
                <span className="text-neutral-600"> — {s.reason}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-emerald-700">{plan.note}</p>
          {planProductIds.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={save}
                disabled={pending || logState === "saved"}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <Check size={15} />
                {logState === "saved"
                  ? "今日の記録に残しました"
                  : logState === "saving"
                    ? "記録中…"
                    : "この組み合わせで使った"}
              </button>
              <p className="text-xs text-neutral-500">
                記録すると、使っていない手持ちが分かるようになります。
              </p>
              {logState === "error" && (
                <p className="text-xs text-rose-600">記録できませんでした{logError ? `（${logError}）` : ""}</p>
              )}
            </div>
          )}
          <p className="text-xs text-neutral-400">
            生成: {plan.source === "llm" ? "LLM" : "ルールベース（OPENAI_API_KEY 未設定時のフォールバック）"}
          </p>
        </div>
      )}
    </section>
  );
}
