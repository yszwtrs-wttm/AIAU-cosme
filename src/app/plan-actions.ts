"use server";

import { getMyUser, isRealAccount } from "@/lib/auth";
import { buildRulePlan, type Plan } from "@/lib/makeup";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

type FunctionPlan = Omit<Plan, "source" | "notice"> & { used?: number; quota?: number };
type FunctionError = { error?: string; used?: number; quota?: number };

async function readError(error: unknown): Promise<FunctionError> {
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return {};
  return (await context.json().catch(() => ({}))) as FunctionError;
}

/** レート制限やLLM不調でルールベースに落ちたとき、理由をUIに出す。 */
function noticeFor(body: FunctionError): string | undefined {
  if (body.error === "rate_limited") {
    return `今日のAI提案の上限（${body.quota ?? 0}回）に達したので、ルールベースで組みました。日付が変わるとまた使えます。`;
  }
  if (body.error === "llm_unavailable") return undefined;
  return "AI提案が使えなかったので、ルールベースで組みました。";
}

/**
 * 手持ちだけで組めるメイク手順を返す。
 * LLM 経路は Supabase Edge Function（makeup-plan）に置いてあり、本アカウントのみ・日次回数制限つき。
 * 呼べない・失敗した場合は色相・明度ベースのルールで組む。
 * どちらの場合も候補は「手持ちに登録済みの商品」に限定する。
 */
export async function generateMakeupPlan(request: string): Promise<Plan> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_items")
    .select(
      "products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name))",
    )
    .returns<{ products: Product }[]>();

  const products = (data ?? []).map((r) => r.products).filter(Boolean);
  const fallback = buildRulePlan(products, request);

  // 匿名セッションは LLM 経路に入れない（費用が読めないため）。Edge Function 側でも弾いている。
  const user = await getMyUser();
  if (!isRealAccount(user) || products.length === 0) return fallback;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return fallback;

  const { data: plan, error } = await supabase.functions.invoke<FunctionPlan>("makeup-plan", {
    body: { request },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) return { ...fallback, notice: noticeFor(await readError(error)) };
  if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) return fallback;

  return { headline: plan.headline, steps: plan.steps, note: plan.note, source: "llm" };
}
