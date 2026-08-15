"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addToStash(productId: number) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "セッションがありません" };

  const { error } = await supabase
    .from("user_items")
    .upsert({ product_id: productId, user_id: userData.user.id }, { onConflict: "user_id,product_id" });

  revalidatePath("/stash");
  revalidatePath(`/products/${productId}`);
  return { ok: !error, error: error?.message };
}

export async function removeFromStash(productId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("user_items").delete().eq("product_id", productId);

  revalidatePath("/stash");
  revalidatePath(`/products/${productId}`);
  return { ok: !error, error: error?.message };
}

export async function postReview(productId: number, rating: number, body: string, authorName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({
    product_id: productId,
    author_name: authorName || "guest",
    author_key: authorName || "guest",
    rating,
    body,
  });
  revalidatePath(`/products/${productId}`);
  return { ok: !error, error: error?.message };
}
