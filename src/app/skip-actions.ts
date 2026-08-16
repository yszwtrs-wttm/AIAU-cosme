"use server";

import { revalidatePath } from "next/cache";
import { isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SkipReason } from "@/lib/types";

type Result = { ok: boolean; error?: string };

/**
 * 「買わずに見送った」記録。
 *
 * 金額はクライアントから受け取らず、サーバで products の価格を読む。
 * 安い代替に置き換えた見送りは、払わずに済んだのは差額だけなので差額を節約額にする。
 * 判定に使った色差・成分類似度も一緒に残して、あとから根拠を示せるようにする。
 */
export async function skipPurchase(input: {
  productId: number;
  reason: SkipReason;
  evidenceProductId?: number | null;
  deltaE?: number | null;
  ingSim?: number | null;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isRealAccount(user)) {
    return { ok: false, error: "見送りの記録にはアカウント登録が必要です" };
  }

  const ids = [input.productId, ...(input.evidenceProductId ? [input.evidenceProductId] : [])];
  const { data: prices, error: priceError } = await supabase
    .from("products")
    .select("id,price_yen")
    .in("id", ids);
  if (priceError) return { ok: false, error: priceError.message };

  const price = prices?.find((row) => row.id === input.productId)?.price_yen;
  if (price == null) return { ok: false, error: "商品が見つかりませんでした" };

  const evidencePrice =
    prices?.find((row) => row.id === input.evidenceProductId)?.price_yen ?? null;
  const saved =
    input.reason === "cheaper_alternative" && evidencePrice != null
      ? Math.max(0, price - evidencePrice)
      : price;

  const upsert = () =>
    supabase.from("skipped_purchases").upsert(
      {
        user_id: user!.id,
        product_id: input.productId,
        price_yen: price,
        saved_yen: saved,
        reason: input.reason,
        evidence_product_id: input.evidenceProductId ?? null,
        evidence_price_yen: evidencePrice,
        evidence_delta_e: input.deltaE ?? null,
        evidence_ing_sim: input.ingSim ?? null,
      },
      { onConflict: "user_id,product_id" },
    );

  let { error } = await upsert();
  if (error?.code === "42501") {
    // お試し（匿名）から登録した直後はトークンの is_anonymous が古いままで RLS に弾かれる。
    // トークンを更新して一度だけやり直す。
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) ({ error } = await upsert());
  }

  revalidatePath("/savings");
  revalidatePath(`/products/${input.productId}`);
  revalidatePath("/me");
  return { ok: !error, error: error?.message };
}

export async function unskipPurchase(productId: number): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isRealAccount(user)) {
    return { ok: false, error: "見送りの記録にはアカウント登録が必要です" };
  }

  const { error } = await supabase
    .from("skipped_purchases")
    .delete()
    .eq("product_id", productId)
    .eq("user_id", user!.id);

  revalidatePath("/savings");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/me");
  return { ok: !error, error: error?.message };
}
