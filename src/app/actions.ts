"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isRealAccount } from "@/lib/auth";
import {
  addManyToStashSchema,
  addToStashSchema,
  attachReviewImagesSchema,
  postReviewSchema,
  removeFromStashSchema,
  reportReviewSchema,
  saveProfileSchema,
  validate,
} from "@/lib/validation";
import type { PersonalColor, SkinType } from "@/lib/types";

type Result = { ok: boolean; error?: string };

export async function addToStash(
  productId: number,
  source: "manual" | "scan" | "photo" | "quick" = "manual",
): Promise<Result> {
  const parsed = validate(addToStashSchema, { productId, source });
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !isRealAccount(user)) {
    return { ok: false, error: "ポーチへの登録にはアカウント登録が必要です" };
  }

  const { error } = await supabase
    .from("user_items")
    .upsert(
      { product_id: parsed.data.productId, user_id: user.id, source: parsed.data.source },
      { onConflict: "user_id,product_id" },
    );

  revalidatePath("/stash");
  revalidatePath(`/products/${parsed.data.productId}`);
  return { ok: !error, error: error?.message };
}

export async function addManyToStash(
  productIds: number[],
  source: "manual" | "scan" | "photo" | "quick" = "quick",
): Promise<Result> {
  const parsed = validate(addManyToStashSchema, { productIds, source });
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !isRealAccount(user)) {
    return { ok: false, error: "ポーチへの登録にはアカウント登録が必要です" };
  }

  const { error } = await supabase.from("user_items").upsert(
    parsed.data.productIds.map((product_id) => ({
      product_id,
      user_id: user.id,
      source: parsed.data.source,
    })),
    { onConflict: "user_id,product_id" },
  );

  revalidatePath("/stash");
  return { ok: !error, error: error?.message };
}

export async function removeFromStash(productId: number): Promise<Result> {
  const parsed = validate(removeFromStashSchema, { productId });
  if (!parsed.ok) return parsed;

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
  return { ok: !error, error: error?.message };
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
  const parsed = validate(postReviewSchema, input);
  if (!parsed.ok) return parsed;
  const review = parsed.data;

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
      product_id: review.productId,
      user_id: user!.id,
      author_name: "",
      author_key: user!.id,
      rating: review.rating,
      body: review.body,
      feel: review.feel ?? null,
    })
    .select("id")
    .maybeSingle();

  revalidatePath(`/products/${review.productId}`);
  revalidatePath("/feed");
  return { ok: !error, error: error?.message, reviewId: data?.id };
}

export async function attachReviewImages(
  reviewId: number,
  images: { path: string; phash?: string | null }[],
): Promise<Result> {
  const parsed = validate(attachReviewImagesSchema, { reviewId, images });
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "セッションがありません" };

  const { error } = await supabase.from("review_images").insert(
    parsed.data.images.map((img, pos) => ({
      review_id: parsed.data.reviewId,
      user_id: user.id,
      path: img.path,
      phash: img.phash ?? null,
      pos,
    })),
  );

  revalidatePath("/feed");
  return { ok: !error, error: error?.message };
}

export async function reportReview(reviewId: number, reason: string): Promise<Result> {
  const parsed = validate(reportReviewSchema, { reviewId, reason });
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("review_reports")
    .insert({ review_id: parsed.data.reviewId, reason: parsed.data.reason });
  return { ok: !error, error: error?.message };
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
  const parsed = validate(saveProfileSchema, input);
  if (!parsed.ok) return parsed;
  const profile = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "セッションがありません" };

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    handle: profile.handle,
    display_name: profile.displayName || profile.handle,
    bio: profile.bio ?? null,
    skin_tone_hex: profile.skinToneHex ?? null,
    skin_type: profile.skinType ?? null,
    personal_color: profile.personalColor ?? null,
    stash_public: profile.stashPublic ?? true,
    avatar_hue: profile.avatarHue ?? 330,
    avatar_url: profile.avatarUrl ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const selectedIds = [...new Set(profile.allergenIds ?? [])];
  const { data: existingAllergens, error: allergenReadError } = await supabase
    .from("profile_allergens")
    .select("ingredient_id")
    .eq("user_id", user.id);
  if (allergenReadError) return { ok: false, error: allergenReadError.message };

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
    if (removeError) return { ok: false, error: removeError.message };
  }
  if (addedIds.length > 0) {
    const { error: addError } = await supabase.from("profile_allergens").insert(
      addedIds.map((ingredient_id) => ({ user_id: user.id, ingredient_id })),
    );
    if (addError) return { ok: false, error: addError.message };
  }

  revalidatePath("/me");
  revalidatePath("/settings");
  return { ok: true };
}
