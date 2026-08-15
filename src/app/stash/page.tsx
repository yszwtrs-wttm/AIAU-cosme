import { redirect } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import MakeupPlan from "@/components/MakeupPlan";
import ProductCard from "@/components/ProductCard";
import QuickStartPicker from "@/components/QuickStartPicker";
import ShadeSwapList from "@/components/ShadeSwapList";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CheaperShadeSwap, Product } from "@/lib/types";

type StashItem = { product_id: number; products: Product };

export default async function StashPage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const supabase = await createClient();

  const [{ data: items }, { data: popular }, swapRes] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "product_id, products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex))",
      )
      .returns<StashItem[]>(),
    supabase
      .from("products")
      .select(
        "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)",
      )
      .order("price_yen", { ascending: true })
      .limit(24)
      .returns<Product[]>(),
    supabase.rpc("find_cheaper_shade_swaps", { p_limit: 8 }),
  ]);

  const products = (items ?? []).map((i) => i.products).filter(Boolean);
  const swaps = (swapRes.data ?? []) as CheaperShadeSwap[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Myポーチ（{products.length}点）</h1>

      {products.length > 0 && <MakeupPlan products={products} />}

      {swaps.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">同じ色なのに安いもの</h2>
          <p className="text-sm text-ink-600">
            ポーチの色を CIEDE2000 の色差 ΔE で他商品のシェードと突き合わせ、色が同じで安いものだけを出しています。
          </p>
          <ShadeSwapList swaps={swaps} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">バーコードで登録</h2>
        <p className="text-sm text-ink-600">
          リストに無いものは、パッケージのバーコードをかざしてください。続けて読み取れます。
        </p>
        <BarcodeScanner />
      </section>

      <QuickStartPicker products={popular ?? []} />

      {products.length === 0 && (
        <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
          まだ登録がありません。よく使う2〜3個登録すれば、調べた商品との違いを出せるようになります。
          このページのバーコード登録か、リストから登録をはじめてみてください。
        </p>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </section>
    </div>
  );
}
