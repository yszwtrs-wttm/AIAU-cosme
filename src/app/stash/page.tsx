import { redirect } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import MakeupPlan from "@/components/MakeupPlan";
import ProductCard from "@/components/ProductCard";
import QuickStartPicker from "@/components/QuickStartPicker";
import UsagePanel from "@/components/UsagePanel";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MakeupLogEntry, Product, StashUsage } from "@/lib/types";

export default async function StashPage() {
  const user = await getMyUser();
  if (!user || !isRealAccount(user)) redirect("/login");

  const supabase = await createClient();

  const [{ data: items }, { data: popular }, { data: logs }] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "product_id, use_count, last_used_on, products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex))",
      )
      // 公開ポーチは他人の行も読めるので、自分の手持ちだけに絞る。
      .eq("user_id", user.id)
      .returns<StashUsage[]>(),
    supabase
      .from("products")
      .select(
        "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)",
      )
      .order("price_yen", { ascending: true })
      .limit(24)
      .returns<Product[]>(),
    supabase
      .from("makeup_logs")
      .select("id, used_on, request, makeup_log_items(pos, products(id,name,brands(name)))")
      .order("used_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(5)
      .returns<MakeupLogEntry[]>(),
  ]);

  const stash = (items ?? []).filter((i) => i.products);
  const products = stash.map((i) => i.products);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Myポーチ（{products.length}点）</h1>

      {products.length > 0 && <MakeupPlan products={products} />}

      {(products.length > 0 || (logs ?? []).length > 0) && (
        <UsagePanel items={stash} logs={logs ?? []} />
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
