import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";
import { enabledSocialProviders } from "@/lib/oauth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const params = await searchParams;
  const hasSocialLogin = enabledSocialProviders().length > 0;
  const user = await getMyUser();
  if (isRealAccount(user)) {
    const profile = await getMyProfile();
    redirect(profile ? "/me" : "/settings");
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">ログイン / アカウントを作る</h1>
        <p className="mt-2 text-sm text-ink-600">
          {hasSocialLogin
            ? "Google / Apple なら、メールを開かずにそのままログインできます。メールで登録する場合は、初回は届いたリンクで確認してプロフィール画面でパスワードを設定します。"
            : "初回はメールアドレスに届くリンクで確認し、プロフィール画面でパスワードを設定します。"}
          お試し利用で登録したポーチはそのまま引き継がれ、別の端末でも使えます。
        </p>
      </section>

      {params.error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{params.error}</p>
      )}

      <LoginForm
        anonymous={Boolean(user?.is_anonymous)}
        initialMode={params.mode === "signup" ? "signup" : "login"}
      />

      <p className="text-xs leading-relaxed text-ink-400">
        商品の検索・成分・口コミの閲覧・写真から色を探す機能はログイン不要です。
        手持ち登録とポーチの利用、口コミの投稿にはログインが必要です。
        <Link href="/search" className="ml-1 text-brand-600 underline">
          商品を探す
        </Link>
      </p>
    </div>
  );
}
