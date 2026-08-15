import { redirect } from "next/navigation";
import Link from "next/link";
import ReviewComposer from "@/components/ReviewComposer";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

const PRODUCT_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

type StashItem = { product_id: number; products: Product };

/** フィードからの口コミ投稿。商品を選んでから、商品詳細と同じフォームで書く。 */
export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const { product } = await searchParams;
  const supabase = await createClient();

  const [{ data: items }, { data: popular }] = await Promise.all([
    supabase
      .from("user_items")
      .select(`product_id, products(${PRODUCT_SELECT})`)
      .returns<StashItem[]>(),
    supabase.from("products").select(PRODUCT_SELECT).limit(40).returns<Product[]>(),
  ]);

  const stashProducts = (items ?? []).map((i) => i.products).filter(Boolean);
  const ownedIds = new Set(stashProducts.map((p) => p.id));
  const candidates = [
    ...stashProducts.map((p) => ({ product: p, owned: true })),
    ...(popular ?? []).filter((p) => !ownedIds.has(p.id)).map((p) => ({ product: p, owned: false })),
  ];

  const initialProductId = Number(product);

  return (
    <div className="space-y-5">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">口コミを投稿</h1>
        <p className="mt-1 text-sm text-ink-600">
          商品を選んで、感想と写真を投稿できます。投稿は
          <Link href="/feed" className="mx-1 font-bold text-brand-600">
            みんなの投稿
          </Link>
          と商品ページに並びます。
        </p>
      </section>

      <ReviewComposer
        candidates={candidates}
        initialProductId={initialProductId > 0 ? initialProductId : undefined}
      />
    </div>
  );
}
