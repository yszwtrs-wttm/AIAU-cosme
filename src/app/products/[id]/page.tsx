import { notFound } from "next/navigation";
import DupeRowItem from "@/components/DupeRowItem";
import ReviewPanel from "@/components/ReviewPanel";
import StashButton from "@/components/StashButton";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, type DupeRow, type Product, type RatingSummary, type Review } from "@/lib/types";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const supabase = await createClient();

  const [{ data: product }, { data: owned }, dupeRes, cheaperRes, { data: reviews }, { data: summary }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name)")
        .eq("id", productId)
        .maybeSingle<Product>(),
      supabase.from("user_items").select("product_id").eq("product_id", productId).maybeSingle(),
      supabase.rpc("find_duplicates_in_stash", { p_product_id: productId }),
      supabase.rpc("find_cheaper_dupes", { p_product_id: productId, p_limit: 5 }),
      supabase.from("reviews").select("*").eq("product_id", productId).order("posted_at", { ascending: false }).returns<Review[]>(),
      supabase.from("product_rating_summary").select("*").eq("product_id", productId).maybeSingle<RatingSummary>(),
    ]);

  if (!product) notFound();

  const dupes = (dupeRes.data ?? []) as DupeRow[];
  const cheaper = (cheaperRes.data ?? []) as DupeRow[];
  const topDupe = dupes[0];
  const bestSaving = cheaper[0];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <div
          className="h-24 w-24 rounded-xl border border-neutral-200"
          style={{ background: product.color_hex ?? "linear-gradient(135deg,#eee,#ddd)" }}
        />
        <div className="min-w-64 flex-1">
          <div className="text-sm text-neutral-500">
            {product.brands?.name} ・ {CATEGORY_LABEL[product.category]}
            {product.is_mens && <span className="ml-2 rounded bg-neutral-900 px-1.5 text-[10px] text-white">MEN</span>}
          </div>
          <h1 className="text-xl font-bold">{product.name}</h1>
          <div className="mt-1 text-lg tabular-nums">
            ¥{product.price_yen.toLocaleString()}
            {product.volume && (
              <span className="ml-2 text-xs text-neutral-500">
                {product.volume}
                {product.volume_unit} ・ ¥{Math.round(product.price_yen / product.volume).toLocaleString()}/
                {product.volume_unit}
              </span>
            )}
          </div>
          {product.jan && <div className="mt-1 text-xs text-neutral-400">JAN {product.jan}</div>}
          <div className="mt-3">
            <StashButton productId={product.id} owned={Boolean(owned)} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">買う前チェック</h2>
        {topDupe ? (
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
            <div className="text-lg font-bold text-amber-900">それ、もう持っています</div>
            <p className="mt-1 text-sm text-amber-900">
              手持ちの「{topDupe.brand} {topDupe.name}」と成分類似度 {(topDupe.ing_sim * 100).toFixed(1)}%
              {topDupe.delta_e !== null && <>・色差 ΔE {topDupe.delta_e.toFixed(2)}</>}。
              {topDupe.delta_e !== null && topDupe.delta_e < 5 && "並べても見分けはつきません。"}
              このまま買うと ¥{product.price_yen.toLocaleString()} の重複支出になります。
            </p>
            <div className="mt-3 space-y-2">
              {dupes.map((row) => <DupeRowItem key={row.product_id} row={row} tone="warn" />)}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            手持ちに似た商品はありません。
            <span className="text-neutral-400">（手持ちを登録すると、ここで重複を判定します）</span>
          </div>
        )}

        {bestSaving && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
            <div className="font-bold text-emerald-900">
              同じような処方で ¥{(bestSaving.savings ?? 0).toLocaleString()} 安い商品があります
            </div>
            <div className="mt-3 space-y-2">
              {cheaper.map((row) => <DupeRowItem key={row.product_id} row={row} tone="save" />)}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold">全成分（配合量の多い順）</h2>
        <ol className="flex flex-wrap gap-1.5 rounded-2xl border border-neutral-200 bg-white p-4 text-xs">
          {product.ingredients.map((ing, i) => (
            <li key={ing} className="rounded bg-neutral-100 px-1.5 py-0.5">
              <span className="text-neutral-400">{i + 1}.</span> {ing}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold">口コミ（不正検出つき）</h2>
        <ReviewPanel productId={product.id} initialReviews={reviews ?? []} initialSummary={summary ?? null} />
      </section>
    </div>
  );
}
