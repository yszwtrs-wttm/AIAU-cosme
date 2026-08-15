import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/**
 * 「書く操作」を許す本アカウントかどうか。閲覧は RLS で公開しているので
 * 訪問者に匿名セッションは発行せず、未ログインのまま閲覧させる。
 * 過去の訪問で発行された匿名セッションが Cookie に残っている場合があるので、
 * 匿名セッションは本アカウントとして扱わない。
 */
export function isRealAccount(user: User | null): boolean {
  return Boolean(user && !user.is_anonymous);
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
