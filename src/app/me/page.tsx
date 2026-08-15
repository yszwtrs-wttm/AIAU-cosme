import Link from "next/link";
import { PiggyBank, Settings } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product, Review } from "@/lib/types";

type StashRow = { products: Product | null };

export default async function MyPage() {
  const supabase = await createClient();
  const user = await getMyUser();
  const profile = await getMyProfile();

  const [{ data: stash }, { data: skips }, { data: myReviews }] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex))",
      )
      .returns<StashRow[]>(),
    supabase.from("skipped_purchases").select("price_yen"),
    user
      ? supabase
          .from("reviews")
          .select("*")
          .eq("user_id", user.id)
          .order("posted_at", { ascending: false })
          .returns<Review[]>()
      : Promise.resolve({ data: [] as Review[] }),
  ]);

  const items = (stash ?? []).map((r) => r.products).filter((p): p is Product => Boolean(p));
  const saved = (skips ?? []).reduce((sum, s) => sum + (s.price_yen ?? 0), 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-4 rounded-4xl bg-brand-gradient p-6 text-white shadow-pop">
        <span
          className="grid h-16 w-16 place-items-center rounded-full bg-white/25 text-2xl font-bold"
          style={profile ? { background: `hsl(${profile.avatar_hue} 70% 62%)` } : undefined}
        >
          {(profile?.display_name ?? "?").slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl font-bold">
            {profile?.display_name ?? "お試しで使っています"}
          </div>
          <div className="text-xs text-white/80">
            {profile ? `@${profile.handle}` : "ログインすると、口コミが書けてポーチを引き継げます"}
          </div>
        </div>
        <Link
          href={isRealAccount(user) ? "/settings" : "/login"}
          className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-600"
        >
          {isRealAccount(user) ? <Settings size={15} /> : null}
          {isRealAccount(user) ? "設定" : "ログイン"}
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-card">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <PiggyBank size={14} /> 買わずに済んだ金額
          </div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-emerald-900">
            ¥{saved.toLocaleString()}
          </div>
        </div>
        <div className="rounded-3xl border border-white bg-white/90 p-4 shadow-card">
          <div className="text-xs font-bold text-ink-400">ポーチの数</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums">{items.length}</div>
        </div>
        <div className="rounded-3xl border border-white bg-white/90 p-4 shadow-card">
          <div className="text-xs font-bold text-ink-400">書いた口コミ</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums">
            {(myReviews ?? []).length}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">ポーチの中身</h2>
          <Link href="/scan" className="text-xs font-bold text-brand-600">
            追加する
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="rounded-3xl border border-white bg-white/85 p-5 text-sm text-ink-600 shadow-card">
            まだ登録がありません。よく使うものを2〜3個だけ登録すると、すぐに重複チェックが動きます。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {(myReviews ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">書いた口コミ</h2>
          <ul className="space-y-2">
            {(myReviews ?? []).map((r) => (
              <li key={r.id} className="rounded-3xl border border-white bg-white/90 p-4 shadow-card">
                <Link href={`/products/${r.product_id}`} className="text-xs text-brand-600">
                  この商品を見る
                </Link>
                <div className="text-amber-500">{"★".repeat(r.rating)}</div>
                <p className="text-sm">{r.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
