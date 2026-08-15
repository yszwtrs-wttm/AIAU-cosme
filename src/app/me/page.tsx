import Link from "next/link";
import { Settings } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product, Review } from "@/lib/types";

type StashRow = { products: Product | null };

export default async function MyPage() {
  const supabase = await createClient();
  const user = await getMyUser();
  const profile = await getMyProfile();

  const [{ data: stash }, { data: myReviews }] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex))",
      )
      .returns<StashRow[]>(),
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

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-200 bg-white p-5">
        <span
          className="grid h-16 w-16 place-items-center rounded-full bg-ink-100 text-2xl font-bold text-white"
          style={profile ? { background: `hsl(${profile.avatar_hue} 70% 62%)` } : undefined}
        >
          {(profile?.display_name ?? "?").slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl font-bold">
            {profile?.display_name ?? "お試しで使っています"}
          </div>
          <div className="text-xs text-ink-400">
            {profile ? `@${profile.handle}` : "ログインすると、口コミが書けてポーチを引き継げます"}
          </div>
        </div>
        <Link
          href={isRealAccount(user) ? "/settings" : "/login"}
          className="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-sm font-bold text-brand-600"
        >
          {isRealAccount(user) ? <Settings size={15} /> : null}
          {isRealAccount(user) ? "設定" : "ログイン"}
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-200 bg-white p-4">
          <div className="text-xs font-bold text-ink-400">ポーチの数</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums">{items.length}</div>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-4">
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
          <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
            まだ登録がありません。よく使うものを2〜3個登録すると、調べた商品との違いを出せるようになります。
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
              <li key={r.id} className="rounded-2xl border border-ink-200 bg-white p-4">
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
