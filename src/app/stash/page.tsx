import { redirect } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import MakeupPlan from "@/components/MakeupPlan";
import QuickStartPicker from "@/components/QuickStartPicker";
import StashItemCard from "@/components/StashItemCard";
import UseUpFirstNotice from "@/components/UseUpFirstNotice";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { SHELF_LIFE_SOURCE_LABEL, judgeUseUp, type StashUsage } from "@/lib/shelf-life";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

type StashRow = StashUsage & { product_id: number; products: Product };

export default async function StashPage() {
  const user = await getMyUser();
  if (!user || !isRealAccount(user)) redirect("/login");

  const supabase = await createClient();

  const [{ data: rows }, { data: popular }] = await Promise.all([
    supabase
      .from("user_items")
      .select(
        "product_id, opened_at, purchased_at, purchase_price_yen, remaining_pct, note, products(id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex))",
      )
      .eq("user_id", user.id)
      .returns<StashRow[]>(),
    supabase
      .from("products")
      .select(
        "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)",
      )
      .order("price_yen", { ascending: true })
      .limit(24)
      .returns<Product[]>(),
  ]);

  const items = (rows ?? [])
    .filter((row) => row.products)
    .map((row) => ({
      opened_at: row.opened_at,
      purchased_at: row.purchased_at,
      purchase_price_yen: row.purchase_price_yen,
      remaining_pct: row.remaining_pct,
      note: row.note,
      product: row.products,
    }));

  // 使い切りたい順（期限の目安が近い / 過ぎている順）。開封日が未入力のものは後ろ。
  const sorted = [...items].sort(
    (a, b) =>
      judgeUseUp(a.product.category, a).sortKey - judgeUseUp(b.product.category, b).sortKey,
  );
  const urgent = sorted.filter((item) => {
    const state = judgeUseUp(item.product.category, item).state;
    return state === "over" || state === "soon";
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Myポーチ（{items.length}点）</h1>

      <UseUpFirstNotice
        items={urgent}
        title="先に使い切りたい手持ち"
        description={`開封日とカテゴリ別の使用期限目安から出しています。買い足す前に、こちらを先に消費できます。${SHELF_LIFE_SOURCE_LABEL}`}
      />

      {items.length > 0 && <MakeupPlan products={items.map((item) => item.product)} />}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">バーコードで登録</h2>
        <p className="text-sm text-ink-600">
          リストに無いものは、パッケージのバーコードをかざしてください。続けて読み取れます。
        </p>
        <BarcodeScanner />
      </section>

      <QuickStartPicker products={popular ?? []} />

      {items.length === 0 && (
        <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
          まだ登録がありません。よく使う2〜3個登録すれば、調べた商品との違いを出せるようになります。
          このページのバーコード登録か、リストから登録をはじめてみてください。
        </p>
      )}

      {items.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">使い切りたい順</h2>
          <p className="text-sm text-ink-600">
            開封日を入れると、期限の目安が近いものから並びます。残量も3段階で記録できます。
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((item) => (
              <StashItemCard key={item.product.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
