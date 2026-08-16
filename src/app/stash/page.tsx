import { redirect } from "next/navigation";
import AddToStashDialog from "@/components/AddToStashDialog";
import MakeupPlan from "@/components/MakeupPlan";
import ProductCard from "@/components/ProductCard";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

type StashItem = { product_id: number; created_at: string; products: Product };

export default async function StashPage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const supabase = await createClient();

  const [{ data: items }, { data: popular }] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "product_id, created_at, products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex))",
      )
      .order("created_at", { ascending: false })
      .returns<StashItem[]>(),
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Myポーチ（{products.length}点）</h1>
          <p className="text-sm text-ink-600">新しく登録したものから並べています。</p>
        </div>
        <AddToStashDialog popular={popular ?? []} />
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-ink-200 bg-ink-0 p-5 text-sm text-ink-600">
          まだ登録がありません。よく使う2〜3個登録すれば、調べた商品との違いを出せるようになります。
          右上の「商品を追加」から、リストで選ぶかバーコードで登録できます。
        </p>
      )}

      {products.length > 0 && <MakeupPlan products={products} />}
    </div>
  );
}
