"use server";

import { buildRulePlan, type Plan } from "@/lib/makeup";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

/**
 * 手持ちだけで組めるメイク手順を返す。
 * OPENAI_API_KEY があれば LLM に組ませ、無ければ色相・明度ベースのルールで組む。
 * どちらの場合も候補は「手持ちに登録済みの商品」に限定する。
 */
export async function generateMakeupPlan(request: string): Promise<Plan> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_items")
    .select(
      "products(id,name,category,is_mens,price_yen,volume,volume_unit,unit_price_yen,jan,image_url,color_hex,ingredients,brands(name))",
    )
    .returns<{ products: Product }[]>();

  const products = (data ?? []).map((r) => r.products).filter(Boolean);
  const fallback = buildRulePlan(products, request);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || products.length === 0) return fallback;

  const inventory = products
    .map((p) => `- ${p.brands?.name} ${p.name} (${p.category}, ${p.color_hex ?? "色情報なし"}, ¥${p.price_yen})`)
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "あなたはコスメの提案をするアシスタントです。ユーザーが所有している商品だけを使い、買い足しを勧めてはいけません。" +
              'JSON で {"headline": string, "steps": [{"order": number, "product": string, "reason": string}], "note": string} を返してください。',
          },
          { role: "user", content: `やりたいこと: ${request}\n手持ち:\n${inventory}` },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    const parsed = JSON.parse(json.choices[0].message.content) as Omit<Plan, "source">;
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) return fallback;
    return { ...parsed, source: "llm" };
  } catch {
    return fallback;
  }
}
