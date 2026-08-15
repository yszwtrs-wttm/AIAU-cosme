// 手持ちだけで組むメイク提案の LLM 経路。
// OPENAI_API_KEY はここ（Edge Function のシークレット）だけに置き、クライアントにも Next.js 側にも出さない。
//   * verify_jwt により JWT が必要。さらに匿名セッションは弾く（本アカウント限定）。
//   * claim_makeup_plan_quota で 1ユーザー1日あたりの回数を数えて制限する。
//   * 候補は呼び出したユーザーの手持ち（user_items）に限定する。JWT をそのまま使うので RLS が効く。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

type PlanStep = { order: number; product: string; reason: string };
type PlanBody = { headline: string; steps: PlanStep[]; note: string };

type StashRow = {
  products: {
    name: string;
    category: string;
    price_yen: number;
    color_hex: string | null;
    brands: { name: string } | null;
  } | null;
};

const DAILY_LIMIT = Number(Deno.env.get("MAKEUP_PLAN_DAILY_LIMIT") ?? "10");

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  if (user.is_anonymous) return json({ error: "real_account_required" }, 403);

  const { request } = (await req.json().catch(() => ({}))) as { request?: string };
  if (typeof request !== "string" || request.trim() === "") {
    return json({ error: "invalid_request" }, 400);
  }

  const { data: quota, error: quotaError } = await supabase
    .rpc("claim_makeup_plan_quota", { p_limit: DAILY_LIMIT })
    .maybeSingle<{ allowed: boolean; used: number; quota: number }>();
  if (quotaError || !quota) return json({ error: "quota_check_failed" }, 500);
  if (!quota.allowed) {
    return json({ error: "rate_limited", used: quota.used, quota: quota.quota }, 429);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "llm_unavailable" }, 503);

  const { data: items } = await supabase
    .from("user_items")
    .select("products(name,category,price_yen,color_hex,brands(name))")
    .returns<StashRow[]>();

  const products = (items ?? []).map((i) => i.products).filter((p): p is NonNullable<StashRow["products"]> => Boolean(p));
  if (products.length === 0) return json({ error: "empty_stash" }, 422);

  const inventory = products
    .map((p) => `- ${p.brands?.name} ${p.name} (${p.category}, ${p.color_hex ?? "色情報なし"}, ¥${p.price_yen})`)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
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
  if (!res.ok) return json({ error: "llm_failed", status: res.status }, 502);

  try {
    const completion = await res.json();
    const parsed = JSON.parse(completion.choices[0].message.content) as PlanBody;
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return json({ error: "llm_failed" }, 502);
    }
    return json({ ...parsed, used: quota.used, quota: quota.quota }, 200);
  } catch {
    return json({ error: "llm_failed" }, 502);
  }
});
