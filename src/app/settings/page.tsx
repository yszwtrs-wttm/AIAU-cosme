import Link from "next/link";
import PasswordSettings from "@/components/PasswordSettings";
import ProfileForm from "@/components/ProfileForm";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { IngredientMaster } from "@/lib/types";

export default async function SettingsPage() {
  const user = await getMyUser();
  const profile = await getMyProfile();

  if (!user || !isRealAccount(user)) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-ink-200 bg-surface p-6 text-sm">
        <h1 className="font-display text-xl font-bold">プロフィール設定</h1>
        <p className="text-ink-600">
          プロフィールを作るにはログインが必要です。いま登録しているポーチの中身は引き継がれます。
        </p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          ログインする
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: ingredients }, { data: allergenRows }] = await Promise.all([
    supabase
      .from("ingredients_master")
      .select("id,name_ja,inci")
      .order("name_ja")
      .returns<IngredientMaster[]>(),
    supabase
      .from("profile_allergens")
      .select("ingredient_id")
      .eq("user_id", user.id),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-2xl font-bold">
        {profile ? "プロフィール設定" : "プロフィール作成"}
      </h1>
      <PasswordSettings hasPassword={Boolean(user.user_metadata?.has_password)} />
      <ProfileForm
        profile={profile}
        ingredients={ingredients ?? []}
        allergenIds={(allergenRows ?? []).map((row) => row.ingredient_id)}
      />
    </div>
  );
}
