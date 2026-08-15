import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import MakeupPlan from "@/components/MakeupPlan";
import ProductCard from "@/components/ProductCard";
import QuickStartPicker from "@/components/QuickStartPicker";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

type StashItem = { product_id: number; products: Product };

export default async function StashPage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const supabase = await createClient();

  const [{ data: items }, { data: popular }, { count: wishCount }, { count: unreadCount }] =
    await Promise.all([
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
      supabase.from("wishlist_items").select("product_id", { count: "exact", head: true }),
      supabase
        .from("wishlist_alerts")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
    ]);

  const products = (items ?? []).map((i) => i.products).filter(Boolean);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Myポーチ（{products.length}点）</h1>

      <Link
        href="/wishlist"
        prefetch
        className="flex items-center gap-3 rounded-2xl border border-plum-300 bg-plum-100 p-4 text-sm text-plum-700"
      >
        <BellRing size={18} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">気になるリスト（{wishCount ?? 0}点）</span>
          <span className="block text-xs">
            {unreadCount
              ? `被り・値下がりの未読通知が ${unreadCount} 件あります`
              : "手持ちが増えて被ったときと、値下がりを知らせます"}
          </span>
        </span>
      </Link>

      {products.length > 0 && <MakeupPlan products={products} />}

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
