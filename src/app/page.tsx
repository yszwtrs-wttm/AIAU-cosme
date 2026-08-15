import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, type Category, type Product } from "@/lib/types";

const CATEGORIES: Category[] = ["lip", "foundation", "shampoo", "treatment"];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; mens?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name)")
    .order("price_yen", { ascending: false });

  if (params.category) query = query.eq("category", params.category);
  if (params.mens === "1") query = query.eq("is_mens", true);
  if (params.q) query = query.ilike("name", `%${params.q}%`);

  const { data, error } = await query.returns<Product[]>();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-neutral-900 p-6 text-white">
        <h1 className="text-2xl font-bold leading-snug">
          「買わなくていい」を、
          <br />
          成分と色の数値で証明する。
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-neutral-300">
          全成分表示の配合順から作った処方ベクトルの cosine 類似度と、CIELAB の ΔE(CIEDE2000)。
          この2つで、あなたのポーチの中身と、いま買おうとしている商品を突き合わせます。
          判定ロジックは全部 Supabase(Postgres) の中にあります。
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/scan" className="rounded-lg bg-white px-3 py-2 font-medium text-neutral-900">
            バーコードで手持ちを登録
          </Link>
          <Link href="/stash" className="rounded-lg border border-neutral-600 px-3 py-2">
            手持ちの被りを見る
          </Link>
          <Link href="/color" className="rounded-lg border border-neutral-600 px-3 py-2">
            画像の色から探す
          </Link>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/"
          className={`rounded-full border px-3 py-1 ${!params.category && params.mens !== "1" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"}`}
        >
          すべて
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/?category=${c}`}
            className={`rounded-full border px-3 py-1 ${params.category === c ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"}`}
          >
            {CATEGORY_LABEL[c]}
          </Link>
        ))}
        <Link
          href="/?mens=1"
          className={`rounded-full border px-3 py-1 ${params.mens === "1" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"}`}
        >
          メンズ
        </Link>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
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
