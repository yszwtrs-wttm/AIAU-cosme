import Link from "next/link";
import { Camera, Heart, Palette, Sparkles } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, type Category, type Product } from "@/lib/types";

const CATEGORIES: Category[] = ["lip", "eyeshadow", "foundation", "shampoo", "treatment"];

const CHIP = "rounded-full border px-3 py-1.5 text-sm transition";
const CHIP_ON = "border-transparent bg-brand-gradient text-white shadow-card";
const CHIP_OFF = "border-brand-100 bg-white/80 text-ink-600 hover:border-brand-300";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; mens?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)")
    .order("price_yen", { ascending: false });

  if (params.category) query = query.eq("category", params.category);
  if (params.mens === "1") query = query.eq("is_mens", true);
  if (params.q) query = query.ilike("name", `%${params.q}%`);

  const [{ data, error }, { count: stashCount }] = await Promise.all([
    query.returns<Product[]>(),
    supabase.from("user_items").select("product_id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-4xl bg-brand-gradient p-6 text-white shadow-pop">
        <div className="absolute inset-0 bg-sheen opacity-60" />
        <div className="relative">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-medium">
            <Sparkles size={12} /> 買う前に3秒チェック
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
            そのコスメ、
            <br />
            もう持ってるかも。
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/90">
            持っているコスメを登録しておくと、気になった商品が「色も中身もほぼ同じ」かどうかを
            すぐに教えます。似ていれば、買わずに済みます。
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <Link
              href="/scan"
              className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 font-bold text-brand-600 shadow-card"
            >
              <Camera size={16} /> 手持ちを登録する
            </Link>
            <Link
              href="/stash"
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2.5 font-medium"
            >
              <Heart size={16} /> ポーチを見る
              {stashCount ? <span className="tabular-nums">{stashCount}</span> : null}
            </Link>
            <Link
              href="/color"
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2.5 font-medium"
            >
              <Palette size={16} /> 写真の色から探す
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
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
      </section>

      {error && (
        <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
          商品を取得できませんでした: {error.message}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </section>
    </div>
  );
}
