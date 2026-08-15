import { redirect } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import WishlistAlertList, { type AlertView } from "@/components/WishlistAlertList";
import WishlistAlertsRealtime from "@/components/WishlistAlertsRealtime";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product, WishlistAlert } from "@/lib/types";

type WishlistRow = { product_id: number; products: Product };

const PRODUCT_COLUMNS =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

export default async function WishlistPage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const supabase = await createClient();

  const [{ data: rows }, { data: alerts }] = await Promise.all([
    supabase
      .from("wishlist_items")
      .select(`product_id, products(${PRODUCT_COLUMNS})`)
      .order("created_at", { ascending: false })
      .returns<WishlistRow[]>(),
    supabase
      .from("wishlist_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<WishlistAlert[]>(),
  ]);

  const products = (rows ?? []).map((row) => row.products).filter(Boolean);

  // 通知の見出しに使う商品名。ウィッシュ側と被った手持ち側の両方をまとめて引く。
  const labelIds = [
    ...new Set(
      (alerts ?? []).flatMap((alert) =>
        [alert.product_id, alert.related_product_id].filter(
          (id): id is number => typeof id === "number",
        ),
      ),
    ),
  ];
  const { data: labelRows } = labelIds.length
    ? await supabase.from("products").select("id,name,brands(name)").in("id", labelIds)
    : { data: [] };
  const labels = new Map(
    (labelRows ?? []).map((row) => [row.id, `${row.brands?.name ?? ""} ${row.name}`.trim()]),
  );

  const alertViews: AlertView[] = (alerts ?? []).map((alert) => ({
    ...alert,
    label: labels.get(alert.product_id) ?? "気になる商品",
    relatedLabel:
      alert.related_product_id !== null ? labels.get(alert.related_product_id) ?? null : null,
  }));

  return (
    <div className="space-y-6">
      <WishlistAlertsRealtime userId={user!.id} />

      <div>
        <h1 className="font-display text-2xl font-bold">気になるリスト（{products.length}点）</h1>
        <p className="mt-1 text-sm text-ink-600">
          保留にしている候補です。ポーチに手持ちが増えて被ったときと、値下がりしたときに知らせます。
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">通知</h2>
        <WishlistAlertList alerts={alertViews} />
      </section>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
          まだ登録がありません。商品ページの「気になるに追加」から入れておくと、あとで判断できます。
        </p>
      ) : (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </div>
  );
}
