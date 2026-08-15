/**
 * Server Action の入力検証。
 *
 * Server Action は実体が HTTP エンドポイントなので、型注釈は何も守ってくれない。
 * ここで zod に通してから DB に渡す。DB 側にも同じ範囲の CHECK 制約を置いて二重に守る。
 */

import { z } from "zod";
import { FEEL_KEYS, FEEL_MAX, FEEL_MIN } from "./feel";
import type { PersonalColor, SkinType } from "./types";

// 個別メッセージを書いていない項目も、既定のエラー文が日本語で返るようにする。
z.config(z.locales.ja());

export const REVIEW_BODY_MAX = 2000;
const MAX_IMAGES = 4;

const rowId = z.number().int().positive();

const source = z.enum(["manual", "scan", "photo", "quick"]);

const skinType: z.ZodType<SkinType> = z.enum([
  "dry",
  "normal",
  "oily",
  "combination",
  "sensitive",
]);

const personalColor: z.ZodType<PersonalColor> = z.enum(["spring", "summer", "autumn", "winter"]);

export const addToStashSchema = z.object({ productId: rowId, source });

export const addManyToStashSchema = z.object({
  productIds: z.array(rowId).min(1).max(200),
  source,
});

export const removeFromStashSchema = z.object({ productId: rowId });

export const postReviewSchema = z.object({
  productId: rowId,
  rating: z.number().int().min(1, "評価は1〜5で入力してください").max(5, "評価は1〜5で入力してください"),
  body: z
    .string()
    .trim()
    .min(1, "口コミの本文を入力してください")
    .max(REVIEW_BODY_MAX, `口コミは${REVIEW_BODY_MAX}文字以内で入力してください`),
  // 送られてくる軸はカテゴリごとに違うので、既知の軸の部分集合を許す。
  feel: z
    .partialRecord(
      z.enum(FEEL_KEYS, { error: "使用感の軸名が不正です" }),
      z.number().int().min(FEEL_MIN, "使用感の値が範囲外です").max(FEEL_MAX, "使用感の値が範囲外です"),
    )
    .optional(),
});

export const attachReviewImagesSchema = z.object({
  reviewId: rowId,
  images: z
    .array(
      z.object({
        // Storage のキー。パス遡上と絶対URLを弾く。
        path: z
          .string()
          .min(1)
          .max(300)
          .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "画像のパスが不正です")
          .refine((p) => !p.includes(".."), "画像のパスが不正です"),
        phash: z.string().max(128).nullish(),
      }),
    )
    .min(1)
    .max(MAX_IMAGES),
});

export const reportReviewSchema = z.object({
  reviewId: rowId,
  reason: z.enum(["ad", "fake", "offensive", "other"]),
});

export const saveProfileSchema = z.object({
  handle: z
    .string()
    .regex(
      /^[a-z0-9_]{3,20}$/,
      "ユーザーIDは半角英小文字・数字・_ の3〜20文字で入力してください",
    ),
  displayName: z.string().trim().max(50),
  bio: z.string().trim().max(500).optional(),
  skinToneHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "肌の色が不正です")
    .nullish(),
  skinType: skinType.nullish(),
  personalColor: personalColor.nullish(),
  stashPublic: z.boolean().optional(),
  avatarHue: z.number().int().min(0).max(360).optional(),
  avatarUrl: z.string().max(2000).nullish(),
  allergenIds: z.array(rowId).max(200).optional(),
});

/** 最初のエラーだけ画面に返す。Server Action の戻り値は { ok, error } に揃えている。 */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "入力内容が正しくありません" };
}
