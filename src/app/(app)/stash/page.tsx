import Link from "next/link";
import MakeupPlan from "@/components/MakeupPlan";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { deltaELabel } from "@/lib/color";
import type { Product, StashOverlap } from "@/lib/types";

type StashItem = { product_id: number; products: Product };

export default async function StashPage() {
  const supabase = await createClient();

  const [{ data: items }, overlapRes] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "product_id, products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name))",
      )
      .returns<StashItem[]>(),
    supabase.rpc("find_stash_overlaps"),
  ]);

  const products = (items ?? []).map((i) => i.products).filter(Boolean);
  const overlaps = (overlapRes.data ?? []) as StashOverlap[];
  const wasted = overlaps.reduce((sum, o) => sum + Math.min(o.a_price, o.b_price), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">手持ち（{products.length}点）</h1>
        <Link href="/scan" className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white">
          バーコードで追加
        </Link>
      </div>

      {products.length === 0 && (
        <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          まだ登録がありません。<Link href="/" className="underline">商品一覧</Link>か
          <Link href="/scan" className="underline">バーコード登録</Link>から追加してください。
        </p>
      )}

      {overlaps.length > 0 && (
        <section className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
          <h2 className="font-bold text-amber-900">手持ちの中で {overlaps.length} 組が実質同じです</h2>
          <p className="text-sm text-amber-900">
            重複している側の合計は ¥{wasted.toLocaleString()}。次からはどちらかを買わずに済みます。
          </p>
          <div className="mt-3 space-y-2">
            {overlaps.map((o) => (
              <div
                key={`${o.a_id}-${o.b_id}`}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-white p-3 text-sm"
              >
                <span className="h-8 w-8 rounded border" style={{ background: o.a_hex ?? "#e5e5e5" }} />
                <Link href={`/products/${o.a_id}`} className="underline">
                  {o.a_label}
                </Link>
                <span className="text-neutral-400">×</span>
                <span className="h-8 w-8 rounded border" style={{ background: o.b_hex ?? "#e5e5e5" }} />
                <Link href={`/products/${o.b_id}`} className="underline">
                  {o.b_label}
                </Link>
                <span className="ml-auto flex gap-2 text-xs text-neutral-600">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 tabular-nums">
                    成分 {(o.ing_sim * 100).toFixed(1)}%
                  </span>
                  {o.delta_e !== null && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 tabular-nums">
                      ΔE {o.delta_e.toFixed(2)}・{deltaELabel(o.delta_e)}
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
