"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isRealAccount } from "@/lib/auth";
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
  return { ok: !error, error: error?.message };
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
  return { ok: !error, error: error?.message };
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
  return { ok: !error, error: error?.message, reviewId: data?.id };
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
  return { ok: !error, error: error?.message };
}

/**
 * 自分の口コミの編集。評価・本文・使用感だけを書き換える。
 * 商品や投稿者の付け替えは RLS と before update トリガーで弾かれる。
 */
export async function updateReview(input: {
  reviewId: number;
  rating: number;
  body: string;
  feel?: Record<string, number> | null;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isRealAccount(user)) return { ok: false, error: "ログインが必要です" };

  if (!input.body.trim()) return { ok: false, error: "本文を入れてください" };
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "評価は1〜5で選んでください" };
  }

  const { data: review, error: readError } = await supabase
    .from("reviews")
    .select("id,product_id,user_id")
    .eq("id", input.reviewId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!review || review.user_id !== user!.id) {
    return { ok: false, error: "自分の口コミだけ編集できます" };
  }

  const { error } = await supabase
    .from("reviews")
    .update({
      rating: input.rating,
      body: input.body,
      ...(input.feel === undefined ? {} : { feel: input.feel }),
    })
    .eq("id", input.reviewId)
    .eq("user_id", user!.id);

  revalidatePath(`/products/${review.product_id}`);
  revalidatePath("/feed");
  revalidatePath("/me");
  return { ok: !error, error: error?.message };
}

/**
 * 自分の口コミの削除。review_images はカスケードで消えるが、
 * Storage の実体は残るので先に片付ける（孤立した画像を作らない）。
 */
export async function deleteReview(reviewId: number): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isRealAccount(user)) return { ok: false, error: "ログインが必要です" };

  const { data: review, error: readError } = await supabase
    .from("reviews")
    .select("id,product_id,user_id,review_images(path)")
    .eq("id", reviewId)
    .maybeSingle<{
      id: number;
      product_id: number;
      user_id: string | null;
      review_images: { path: string }[] | null;
    }>();
  if (readError) return { ok: false, error: readError.message };
  if (!review || review.user_id !== user!.id) {
    return { ok: false, error: "自分の口コミだけ削除できます" };
  }

  const paths = (review.review_images ?? []).map((img) => img.path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("review-images").remove(paths);
    if (storageError) return { ok: false, error: storageError.message };
  }

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user!.id);

  revalidatePath(`/products/${review.product_id}`);
  revalidatePath("/feed");
  revalidatePath("/me");
  return { ok: !error, error: error?.message };
}

export async function reportReview(reviewId: number, reason: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("review_reports").insert({ review_id: reviewId, reason });
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

  if (error) return { ok: false, error: error.message };

  const selectedIds = [...new Set(input.allergenIds ?? [])];
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
