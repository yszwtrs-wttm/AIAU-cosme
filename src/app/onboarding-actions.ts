"use server";

import { revalidatePath } from "next/cache";
import { isRealAccount } from "@/lib/auth";
import { judgeFit } from "@/lib/fit";
import { createClient } from "@/lib/supabase/server";
import type { Category, DupeRow, Product, ProductScore, Profile, SkinType } from "@/lib/types";

type Result = { ok: boolean; error?: string };

const PRODUCT_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

/**
 * 最後に見せる「今すぐ判定できる商品」1件。
 *   * dupe: 登録した手持ちと被っている候補（買わなくていい体験）
 *   * fit:  手持ちが空でも、肌情報から合いそうな1件
 *   * none: どちらも出せない（すべてスキップした場合など）
 */
export type OnboardingDemo =
  | {
      kind: "dupe";
      productId: number;
      label: string;
      brand: string;
      category: Category;
      colorHex: string | null;
      imageUrl: string | null;
      priceYen: number;
      ownedLabel: string;
      ingSim: number;
      deltaE: number | null;
      savings: number;
    }
  | {
      kind: "fit";
      productId: number;
      label: string;
      brand: string;
      category: Category;
      colorHex: string | null;
      imageUrl: string | null;
      priceYen: number;
      headline: string;
      reason: string;
    }
  | { kind: "none" };

async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isRealAccount(user)) {
    return { error: "ログインが必要です" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Profile>();
  if (!profile) return { error: "プロフィールがまだありません" as const };

  return { supabase, userId: user.id, profile };
}

/** ステップの結果をその場で保存する。スキップでも呼び、進んだところだけ更新する。 */
export async function saveOnboardingStep(input: {
  step: number;
  skinType?: SkinType | null;
  skinToneHex?: string | null;
}): Promise<Result> {
  const ctx = await requireProfile();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, userId, profile } = ctx;

  const patch: Record<string, unknown> = {
    onboarding_step: Math.max(profile.onboarding_step, input.step),
  };
  if (input.skinType !== undefined) patch.skin_type = input.skinType;
  if (input.skinToneHex !== undefined) patch.skin_tone_hex = input.skinToneHex;

  const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/me");
  return { ok: true };
}

/** ウィザードを終える。完了しても「あとでやる」でも、次回から自動では出さない。 */
export async function finishOnboarding(): Promise<Result> {
  const ctx = await requireProfile();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, userId } = ctx;

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_done_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/me");
  return { ok: true };
}

/**
 * 登録直後に「判定できる商品」を1つ選ぶ。
 * ポーチに入っている商品ごとに安い類似品を引き、いちばん似ている1件を出す。
 */
export async function pickOnboardingDemo(): Promise<OnboardingDemo> {
  const ctx = await requireProfile();
  if ("error" in ctx) return { kind: "none" };
  const { supabase, userId, profile } = ctx;

  const { data: items } = await supabase
    .from("user_items")
    .select("product_id, products(id,name,price_yen,brands(name))")
    .eq("user_id", userId)
    .limit(5)
    .returns<{ product_id: number; products: { id: number; name: string; price_yen: number; brands: { name: string } | null } | null }[]>();

  const stash = items ?? [];
  const owned = new Set(stash.map((item) => item.product_id));

  if (stash.length > 0) {
    const results = await Promise.all(
      stash
        .slice(0, 3)
        .map((item) => supabase.rpc("find_cheaper_dupes", { p_product_id: item.product_id, p_limit: 3 })),
    );

    let best: { row: DupeRow; ownedLabel: string } | null = null;
    results.forEach((res, index) => {
      const item = stash[index];
      const ownedProduct = item.products;
      const ownedLabel = ownedProduct
        ? `${ownedProduct.brands?.name ?? ""} ${ownedProduct.name}`.trim()
        : "登録した商品";
      for (const row of (res.data ?? []) as DupeRow[]) {
        if (owned.has(row.product_id)) continue;
        if (!best || row.score > best.row.score) best = { row, ownedLabel };
      }
    });

    if (best) {
      const { row, ownedLabel } = best as { row: DupeRow; ownedLabel: string };
      // find_cheaper_dupes はカテゴリを返さないので、サムネイルの形のために商品側から取る。
      const { data: candidate } = await supabase
        .from("products")
        .select("category,color_hex")
        .eq("id", row.product_id)
        .maybeSingle<Pick<Product, "category" | "color_hex">>();

      return {
        kind: "dupe",
        productId: row.product_id,
        label: row.name,
        brand: row.brand,
        category: candidate?.category ?? "lip",
        colorHex: candidate?.color_hex ?? row.color_hex,
        imageUrl: row.image_url,
        priceYen: row.price_yen,
        ownedLabel,
        ingSim: row.ing_sim,
        deltaE: row.delta_e,
        savings: row.savings ?? 0,
      };
    }
  }

  if (!profile.skin_type && !profile.skin_tone_hex) return { kind: "none" };

  const [{ data: products }, { data: scores }] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).returns<Product[]>(),
    supabase.from("product_score").select("*").returns<ProductScore[]>(),
  ]);

  const rank = new Map((scores ?? []).map((score) => [score.product_id, score.ranked_rating ?? 0]));
  const candidate = [...(products ?? [])]
    .filter((product) => !owned.has(product.id))
    .sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0))
    .map((product) => ({ product, fit: judgeFit(product, profile) }))
    .find(({ fit }) => fit.verdict === "good");

  if (!candidate) return { kind: "none" };

  return {
    kind: "fit",
    productId: candidate.product.id,
    label: candidate.product.name,
    brand: candidate.product.brands?.name ?? "",
    category: candidate.product.category,
    colorHex: candidate.product.color_hex,
    imageUrl: candidate.product.image_url,
    priceYen: candidate.product.price_yen,
    headline: candidate.fit.headline,
    reason:
      candidate.fit.reasons.find((reason) => reason.tone === "plus")?.text ??
      candidate.fit.reasons[0]?.text ??
      "",
  };
}
