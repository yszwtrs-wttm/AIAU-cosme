"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isRealAccount } from "@/lib/auth";
import { reportSupabaseError } from "@/lib/observability";
import type { PersonalColor, SkinType } from "@/lib/types";

type Result = { ok: boolean; error?: string };

export async function addToStash(
  productId: number,
  source: "manual" | "scan" | "photo" | "quick" = "manual",
): Promise<Result> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !isRealAccount(user)) {
    return { ok: false, error: "ポーチへの登録にはアカウント登録が必要です" };
  }

  const { error } = await supabase
    .from("user_items")
    .upsert(
      { product_id: productId, user_id: user.id, source },
      { onConflict: "user_id,product_id" },
    );

  revalidatePath("/stash");
  revalidatePath(`/products/${productId}`);
  if (error) return { ok: false, error: reportSupabaseError("addToStash", error, { productId, source }) };
  return { ok: true };
}

export async function addManyToStash(
  productIds: number[],
  source: "manual" | "scan" | "photo" | "quick" = "quick",
): Promise<Result> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !isRealAccount(user)) {
    return { ok: false, error: "ポーチへの登録にはアカウント登録が必要です" };
  }

  const { error } = await supabase.from("user_items").upsert(
    productIds.map((product_id) => ({ product_id, user_id: user.id, source })),
    { onConflict: "user_id,product_id" },
  );

  revalidatePath("/stash");
  if (error) {
    return { ok: false, error: reportSupabaseError("addManyToStash", error, { count: productIds.length }) };
  }
  return { ok: true };
}

export async function removeFromStash(productId: number): Promise<Result> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !isRealAccount(user)) {
    return { ok: false, error: "ポーチの利用にはアカウント登録が必要です" };
  }

  const { error } = await supabase
    .from("user_items")
    .delete()
    .eq("product_id", productId)
    .eq("user_id", user.id);

  revalidatePath("/stash");
  revalidatePath(`/products/${productId}`);
  if (error) return { ok: false, error: reportSupabaseError("removeFromStash", error, { productId }) };
  return { ok: true };
}

/**
 * 口コミ投稿。名前の手入力は廃止し、投稿者はログイン中のアカウントから決まる。
 * 書けるのは本アカウント（お試しの匿名セッションは不可）だけ。RLS でも同じ条件を掛けている。
 * 「持っているか」は自己申告で検証できないので投稿条件にはせず、集計の重みだけに使う。
 */
export async function postReview(input: {
  productId: number;
  rating: number;
  body: string;
  feel?: Record<string, number>;
}): Promise<Result & { reviewId?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isRealAccount(user)) {
    return { ok: false, error: "口コミの投稿にはアカウント登録が必要です" };
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      product_id: input.productId,
      user_id: user!.id,
      author_name: "",
      author_key: user!.id,
      rating: input.rating,
      body: input.body,
      feel: input.feel ?? null,
    })
    .select("id")
    .maybeSingle();

  revalidatePath(`/products/${input.productId}`);
  revalidatePath("/feed");
  if (error) {
    return { ok: false, error: reportSupabaseError("postReview", error, { productId: input.productId }) };
  }
  return { ok: true, reviewId: data?.id };
}

export async function attachReviewImages(
  reviewId: number,
  images: { path: string; phash?: string | null }[],
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "セッションがありません" };

  const { error } = await supabase.from("review_images").insert(
    images.map((img, pos) => ({
      review_id: reviewId,
      user_id: user.id,
      path: img.path,
      phash: img.phash ?? null,
      pos,
    })),
  );

  revalidatePath("/feed");
  if (error) {
    return {
      ok: false,
      error: reportSupabaseError("attachReviewImages", error, { reviewId, count: images.length }),
    };
  }
  return { ok: true };
}

export async function reportReview(reviewId: number, reason: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("review_reports").insert({ review_id: reviewId, reason });
  if (error) return { ok: false, error: reportSupabaseError("reportReview", error, { reviewId }) };
  return { ok: true };
}

export async function saveProfile(input: {
  handle: string;
  displayName: string;
  bio?: string;
  skinToneHex?: string | null;
  skinType?: SkinType | null;
  personalColor?: PersonalColor | null;
  stashPublic?: boolean;
  avatarHue?: number;
  avatarUrl?: string | null;
  allergenIds?: number[];
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "セッションがありません" };

  if (!/^[a-z0-9_]{3,20}$/.test(input.handle)) {
    return { ok: false, error: "ユーザーIDは半角英小文字・数字・_ の3〜20文字で入力してください" };
  }

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    handle: input.handle,
    display_name: input.displayName || input.handle,
    bio: input.bio ?? null,
    skin_tone_hex: input.skinToneHex ?? null,
    skin_type: input.skinType ?? null,
    personal_color: input.personalColor ?? null,
    stash_public: input.stashPublic ?? true,
    avatar_hue: input.avatarHue ?? 330,
    avatar_url: input.avatarUrl ?? null,
  });

  if (error) {
    return {
      ok: false,
      error: reportSupabaseError("saveProfile", error, {}, "そのユーザーIDは他の人が使っています"),
    };
  }

  const selectedIds = [...new Set(input.allergenIds ?? [])];
  const { data: existingAllergens, error: allergenReadError } = await supabase
    .from("profile_allergens")
    .select("ingredient_id")
    .eq("user_id", user.id);
  if (allergenReadError) {
    return { ok: false, error: reportSupabaseError("saveProfile.readAllergens", allergenReadError) };
  }

  const existingIds = new Set((existingAllergens ?? []).map((row) => row.ingredient_id));
  const selectedSet = new Set(selectedIds);
  const removedIds = [...existingIds].filter((id) => !selectedSet.has(id));
  const addedIds = selectedIds.filter((id) => !existingIds.has(id));

  if (removedIds.length > 0) {
    const { error: removeError } = await supabase
      .from("profile_allergens")
      .delete()
      .eq("user_id", user.id)
      .in("ingredient_id", removedIds);
    if (removeError) {
      return { ok: false, error: reportSupabaseError("saveProfile.removeAllergens", removeError) };
    }
  }
  if (addedIds.length > 0) {
    const { error: addError } = await supabase.from("profile_allergens").insert(
      addedIds.map((ingredient_id) => ({ user_id: user.id, ingredient_id })),
    );
    if (addError) {
      return { ok: false, error: reportSupabaseError("saveProfile.addAllergens", addError) };
    }
  }

  revalidatePath("/me");
  revalidatePath("/settings");
  return { ok: true };
}
