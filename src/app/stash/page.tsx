import { redirect } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import MakeupPlan from "@/components/MakeupPlan";
import ProductCard from "@/components/ProductCard";
import QuickStartPicker from "@/components/QuickStartPicker";
import StashUsage from "@/components/StashUsage";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product, RemainingLevel } from "@/lib/types";
import { judgeUsage } from "@/lib/usage";

type StashItem = {
  product_id: number;
  remaining_level: RemainingLevel;
  opened_at: string | null;
  finished_at: string | null;
  products: Product;
};

export default async function StashPage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const supabase = await createClient();

  const [{ data: items }, { data: popular }] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "product_id, remaining_level, opened_at, finished_at, products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex))",
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
  ]);

  const entries = (items ?? [])
    .filter((i) => i.products)
    .map((i) => ({
      entry: {
        product_id: i.product_id,
        remaining_level: i.remaining_level,
        opened_at: i.opened_at,
        finished_at: i.finished_at,
      },
      product: i.products,
      judgement: judgeUsage(i.products.category, i),
    }));

  const inUse = entries.filter((e) => !e.judgement.finished);
  const finished = entries.filter((e) => e.judgement.finished);
  const useUpSoon = inUse.filter((e) => e.judgement.readyToBuy);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Myポーチ（{inUse.length}点）</h1>

      {useUpSoon.length > 0 && (
        <section className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <h2 className="font-display text-lg font-bold text-brand-700">
            そろそろ使い切りどき（{useUpSoon.length}点）
          </h2>
          <p className="mt-1 text-xs text-ink-600">
            新しいものを買う前に、ここから使い切ると無駄が出ません。
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {useUpSoon.map(({ product, judgement }) => (
              <li key={product.id}>
                <span className="font-bold">
                  {product.brands?.name} {product.name}
                </span>
                <span className="ml-2 text-xs text-ink-600">{judgement.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {inUse.length > 0 && <MakeupPlan products={inUse.map((e) => e.product)} />}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">バーコードで登録</h2>
        <p className="text-sm text-ink-600">
          リストに無いものは、パッケージのバーコードをかざしてください。続けて読み取れます。
        </p>
        <BarcodeScanner />
      </section>

      <QuickStartPicker products={popular ?? []} />

      {entries.length === 0 && (
        <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
          まだ登録がありません。よく使う2〜3個登録すれば、調べた商品との違いを出せるようになります。
          このページのバーコード登録か、リストから登録をはじめてみてください。
        </p>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {inUse.map(({ product, entry }) => (
          <div key={product.id} className="space-y-2">
            <ProductCard product={product} />
            <StashUsage category={product.category} entry={entry} />
          </div>
        ))}
      </section>

      {finished.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">使い切ったもの（{finished.length}点）</h2>
          <p className="text-xs text-ink-600">
            被り判定からは外しています。もう一度買うなら、ここから戻せます。
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {finished.map(({ product, entry }) => (
              <div key={product.id} className="space-y-2 opacity-70">
                <ProductCard product={product} />
                <StashUsage category={product.category} entry={entry} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
