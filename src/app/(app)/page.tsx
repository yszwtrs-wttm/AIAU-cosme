import Link from "next/link";
import { Camera, Heart, Palette } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getMyProfile } from "@/lib/auth";
import { judgeFit } from "@/lib/fit";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, type Category, type Product, type ProductScore } from "@/lib/types";

const CATEGORIES: Category[] = ["lip", "eyeshadow", "foundation", "shampoo", "treatment"];

const CHIP = "rounded-full border px-3 py-1.5 text-sm transition";
const CHIP_ON = "border-ink-900 bg-ink-900 text-white";
const CHIP_OFF = "border-ink-200 bg-white text-ink-600 hover:border-ink-400";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; mens?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)");

  if (params.category) query = query.eq("category", params.category);
  if (params.mens === "1") query = query.eq("is_mens", true);
  if (params.q) query = query.ilike("name", `%${params.q}%`);

  const [{ data, error }, { count: stashCount }, { data: scores }, profile] = await Promise.all([
    query.returns<Product[]>(),
    supabase.from("user_items").select("product_id", { count: "exact", head: true }),
    supabase.from("product_score").select("*").returns<ProductScore[]>(),
    getMyProfile(),
  ]);

  // 「点数は高いが信用できる口コミが少ない商品」を上に出さない補正済みの評価で並べる。
  const rank = new Map((scores ?? []).map((s) => [s.product_id, s.ranked_rating ?? 0]));
  const products = [...(data ?? [])].sort(
    (a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0),
  );

  const hasSkinInfo = Boolean(profile?.skin_type || profile?.skin_tone_hex);
  const suggestions = hasSkinInfo
    ? products
        .map((p) => ({ product: p, fit: judgeFit(p, profile) }))
        .filter((x) => x.fit.verdict === "good")
        .slice(0, 4)
    : [];

  return (
    <div className="space-y-8">
      <section className="border-b border-ink-200 pb-6">
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
          そのコスメ、
          <br />
          自分に合ってる？
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
          成分・色・口コミから、気になった商品が自分に合いそうかを判定します。
          持っているものとの違い、似ていて安いものとの差も出すので、
          買う意味があるかどうかを自分で決められます。
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link
            href="/scan"
            className="flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2.5 font-bold text-white"
          >
            <Camera size={16} /> 手持ちを登録する
          </Link>
          <Link
            href="/stash"
            className="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2.5 font-medium"
          >
            <Heart size={16} /> ポーチを見る
            {stashCount ? <span className="tabular-nums">{stashCount}</span> : null}
          </Link>
          <Link
            href="/color"
            className="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2.5 font-medium"
          >
            <Palette size={16} /> 写真の色から探す
          </Link>
        </div>
      </section>

      {hasSkinInfo ? (
        suggestions.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-bold">あなたに合いそうなもの</h2>
              <p className="text-xs text-ink-400">
                登録した肌の状態・肌の色と、成分表・色番号から選んでいます。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.map(({ product, fit }) => (
                <div key={product.id} className="space-y-1.5">
                  <ProductCard product={product} />
                  <p className="px-1 text-xs text-ink-600">
                    {fit.reasons.find((r) => r.tone === "plus")?.text ?? fit.headline}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )
      ) : (
        <section className="rounded-2xl border border-ink-200 bg-white p-4 text-sm">
          <p className="font-bold">肌の状態と肌の色を登録すると、合いそうなものを出せます</p>
          <p className="mt-1 text-xs text-ink-600">
            登録は2項目だけです。手持ちのコスメが0件でも判定できます。
          </p>
          <Link href="/settings" className="mt-2 inline-block text-xs font-bold text-brand-600">
            登録する
          </Link>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className={`${CHIP} ${!params.category && params.mens !== "1" ? CHIP_ON : CHIP_OFF}`}
          >
            すべて
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/?category=${c}`}
              className={`${CHIP} ${params.category === c ? CHIP_ON : CHIP_OFF}`}
            >
              {CATEGORY_LABEL[c]}
            </Link>
          ))}
          <Link href="/?mens=1" className={`${CHIP} ${params.mens === "1" ? CHIP_ON : CHIP_OFF}`}>
            メンズ
          </Link>
        </div>

        <p className="text-xs text-ink-400">
          信用できる口コミの評価が高い順。口コミが少ないうちは上に来ません。
        </p>

        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            商品を取得できませんでした: {error.message}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
