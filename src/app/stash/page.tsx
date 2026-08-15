import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { redirect } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import MakeupPlan from "@/components/MakeupPlan";
import ProductCard from "@/components/ProductCard";
import QuickStartPicker from "@/components/QuickStartPicker";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product, StashOverlap } from "@/lib/types";
import { colorMatchBadge, formulaMatchBadge } from "@/lib/wording";

type StashItem = { product_id: number; products: Product };

export default async function StashPage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const supabase = await createClient();

  const [{ data: items }, overlapRes, { data: popular }] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "product_id, products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex))",
      )
      .returns<StashItem[]>(),
    supabase.rpc("find_stash_overlaps"),
    supabase
      .from("products")
      .select(
        "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)",
      )
      .order("price_yen", { ascending: true })
      .limit(24)
      .returns<Product[]>(),
  ]);

  const products = (items ?? []).map((i) => i.products).filter(Boolean);
  const overlaps = (overlapRes.data ?? []) as StashOverlap[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">ポーチ（{products.length}点）</h1>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">バーコードで登録</h2>
        <p className="text-sm text-ink-600">
          リストに無いものは、パッケージのバーコードをかざしてください。続けて読み取れます。
        </p>
        <BarcodeScanner />
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">リストから選んで登録</h2>
        <QuickStartPicker products={popular ?? []} />
      </section>

      {products.length === 0 && (
        <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
          まだ登録がありません。よく使う2〜3個登録すれば、調べた商品との違いを出せるようになります。
          このページのバーコード登録か、リストから登録をはじめてみてください。
        </p>
      )}

      {overlaps.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="flex items-center gap-1.5 font-bold text-amber-900">
            <AlertTriangle size={17} /> ポーチの中で {overlaps.length} 組がほぼ同じです
          </h2>
          <p className="text-sm text-amber-900">
            使い分けているならそのままで。同じ用途なら、次はどちらか1つで足ります。
          </p>
          <div className="mt-3 space-y-2">
            {overlaps.map((o) => (
              <div
                key={`${o.a_id}-${o.b_id}`}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-white p-3 text-sm"
              >
                <span className="swatch inline-block h-8 w-8 rounded-full" style={{ background: o.a_hex ?? "#e9e2e6" }} />
                <Link href={`/products/${o.a_id}`} className="font-medium hover:text-brand-600">
                  {o.a_label}
                </Link>
                <span className="text-ink-400">と</span>
                <span className="swatch inline-block h-8 w-8 rounded-full" style={{ background: o.b_hex ?? "#e9e2e6" }} />
                <Link href={`/products/${o.b_id}`} className="font-medium hover:text-brand-600">
                  {o.b_label}
                </Link>
                <span className="ml-auto flex gap-1.5 text-[11px]">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                    {formulaMatchBadge(o.ing_sim)}
                  </span>
                  {o.delta_e !== null && (
                    <span className="rounded-full bg-plum-100 px-2 py-0.5 text-plum-700">
                      {colorMatchBadge(o.delta_e)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </section>

      {products.length > 0 && <MakeupPlan products={products} />}
    </div>
  );
}
