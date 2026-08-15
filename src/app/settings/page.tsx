import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await getMyUser();
  const profile = await getMyProfile();

  if (!isRealAccount(user)) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-4xl border border-white bg-white/90 p-6 text-sm shadow-card">
        <h1 className="font-display text-xl font-bold">プロフィール設定</h1>
        <p className="text-ink-600">
          プロフィールを作るにはログインが必要です。いま登録しているポーチの中身は引き継がれます。
        </p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-card"
        >
          ログインする
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-2xl font-bold">
        {profile ? "プロフィール設定" : "はじめる前に、プロフィールを作ります"}
      </h1>
      <ProfileForm profile={profile} email={user?.email ?? null} />
    </div>
  );
}
