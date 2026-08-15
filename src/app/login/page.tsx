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
        <h1 className="font-display text-2xl font-bold">ログイン / アカウントを作る</h1>
        <p className="mt-2 text-sm text-ink-600">
          ログインすると、手持ちのポーチを使えて、別の端末でも見られます。口コミも書けるようになります。
          すでに匿名で登録した手持ちがあれば、そのまま引き継がれます。
        </p>
      </section>

      <LoginForm anonymous={Boolean(user?.is_anonymous)} />

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
