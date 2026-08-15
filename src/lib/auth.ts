import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/**
 * お試し利用（匿名セッション）と本アカウントの区別。
 * 口コミ投稿など「書く操作」は本アカウントだけに許す。
 */
export function isRealAccount(user: User | null): boolean {
  if (!user) return false;
  if (user.is_anonymous) return false;
  return Boolean(user.email || user.phone || (user.identities ?? []).length > 0);
}

/**
 * layout・ヘッダー・ページが同じリクエスト内で何度も呼ぶので、
 * Supabase Auth への往復とプロフィール取得は 1 リクエスト 1 回にまとめる。
 */
export const getMyUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await getMyUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Profile>();

  return data ?? null;
});
