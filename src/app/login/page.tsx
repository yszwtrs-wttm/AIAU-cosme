import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getMyUser();
  if (isRealAccount(user)) {
    const profile = await getMyProfile();
    redirect(profile ? "/me" : "/settings");
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">アカウントを作る</h1>
        <p className="mt-2 text-sm text-ink-600">
          ログインすると、ポーチを別の端末でも見られて、口コミも書けるようになります。
          いま登録したポーチの中身は、そのまま引き継がれます。
        </p>
      </section>

      <LoginForm anonymous={Boolean(user?.is_anonymous)} />

      <p className="text-xs leading-relaxed text-ink-400">
        ログインしなくても、商品の検索・成分・口コミの閲覧・写真から色を探す機能は使えます。
        <Link href="/search" className="ml-1 text-brand-600 underline">
          そのまま見る
        </Link>
      </p>
    </div>
  );
}
