import { hexToLab } from "./color";
import { CATEGORY_LABEL, type Product } from "./types";

export type PlanStep = { order: number; product: string; reason: string };
export type Plan = { headline: string; steps: PlanStep[]; note: string; source: "llm" | "rule" };

type Mood = { key: string; label: string; match: (lab: { l: number; a: number; b: number }) => number };

const MOODS: Mood[] = [
  { key: "清楚", label: "血色を足しつつ主張しすぎない", match: ({ l, a }) => -Math.abs(l - 65) - Math.abs(a - 25) },
  { key: "華やか", label: "彩度の高い色で顔の中心を作る", match: ({ a, b }) => Math.hypot(a, b) },
  { key: "ナチュラル", label: "肌色に近い低彩度でまとめる", match: ({ a, b }) => -Math.hypot(a, b) },
  { key: "大人", label: "明度を落として締める", match: ({ l }) => -l },
];

function pickMood(request: string): Mood {
  return MOODS.find((m) => request.includes(m.key)) ?? MOODS[0];
}

/** LLM が無い環境でも必ず答えを返すためのルールベース版。 */
export function buildRulePlan(products: Product[], request: string): Plan {
  const mood = pickMood(request);
  const steps: PlanStep[] = [];

  const base = products.filter((p) => p.category === "foundation" || p.category === "bb");
  const lips = products.filter((p) => p.category === "lip" && p.color_hex);

  if (base.length > 0) {
    const cheapest = [...base].sort((a, b) => a.price_yen - b.price_yen)[0];
    steps.push({
      order: steps.length + 1,
      product: `${cheapest.brands?.name} ${cheapest.name}`,
      reason: "ベースは手持ちの中で一番減りが早くて良いものを薄く。",
    });
  }

  if (lips.length > 0) {
    const scored = lips
      .map((p) => ({ p, score: mood.match(hexToLab(p.color_hex!)) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0].p;
    steps.push({
      order: steps.length + 1,
      product: `${best.brands?.name} ${best.name}`,
      reason: `${mood.key}見えの条件（${mood.label}）に、手持ちの中で色が一番近い。`,
    });
    if (scored.length > 1) {
      const second = scored[1].p;
      steps.push({
        order: steps.length + 1,
        product: `${second.brands?.name} ${second.name}`,
        reason: "内側に重ねてグラデーションにすると、同じ手持ちで印象を変えられる。",
      });
    }
  }

  const hair = products.filter((p) => p.category === "shampoo" || p.category === "treatment");
  if (hair.length > 0) {
    steps.push({
      order: steps.length + 1,
      product: `${hair[0].brands?.name} ${hair[0].name}`,
      reason: "前日の夜はこれで整えておくと、当日のセットが早い。",
    });
  }

  const missing = (["foundation", "lip"] as const).filter((c) => !products.some((p) => p.category === c));

  return {
    headline: `「${request || mood.key}」は、いま持っているコスメだけで作れます`,
    steps,
    note:
      missing.length > 0
        ? `不足しているのは ${missing.map((c) => CATEGORY_LABEL[c]).join("・")} だけ。それ以外の買い足しは不要です。`
        : "買い足しは不要です。",
    source: "rule",
  };
}
