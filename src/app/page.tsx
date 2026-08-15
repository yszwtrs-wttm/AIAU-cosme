import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CircleDollarSign, Search, ShieldCheck, Sparkles } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductScore } from "@/lib/types";

const PRODUCT_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

async function getRankedProducts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data }, { data: scores }] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).returns<Product[]>(),
    supabase.from("product_score").select("*").returns<ProductScore[]>(),
  ]);

  const rank = new Map((scores ?? []).map((score) => [score.product_id, score.ranked_rating ?? 0]));
  return [...(data ?? [])]
    .sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0))
    .slice(0, 8);
}

export default async function Home() {
  const supabase = await createClient();
  const user = await getMyUser();

  if (!isRealAccount(user)) {
    return <LandingPage products={await getRankedProducts(supabase)} />;
  }

  redirect("/search");
}

function LandingPage({ products }: { products: Product[] }) {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-brand-50 px-5 py-8 sm:px-10 sm:py-12">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-bold tracking-wide text-brand-600">KAWANAI</p>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            そのコスメ、
            <br />
            自分に合ってる？
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base">
            成分・色・口コミから、気になった商品が自分に合いそうかを判定します。
            買う前に知れば、買わないほうがいい理由も見つかります。
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              href="/login?mode=signup"
              className="flex items-center gap-1.5 rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white"
            >
              はじめる <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-5 py-3 text-sm font-bold"
            >
              ログイン
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-5 py-3 text-sm font-bold"
            >
              ログインせずに探す <Search size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold">買う前に、3つの視点で確認</h2>
          <p className="mt-1 text-sm text-ink-600">「買わない」も含めて、自分で選べます。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={<Sparkles size={20} />}
            title="自分に合うか判定"
            text="成分と色から、肌の状態や肌の色に合いそうかを確認できます。"
          />
          <FeatureCard
            icon={<CircleDollarSign size={20} />}
            title="似たものを見つける"
            text="手持ちとの被りや、似ていてもっと手頃なものを見つけられます。"
          />
          <FeatureCard
            icon={<ShieldCheck size={20} />}
            title="口コミを見極める"
            text="信用できる口コミだけを集計して、商品の評判を見られます。"
          />
        </div>
      </section>

      {products.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">人気の商品を少しだけ</h2>
              <p className="mt-1 text-sm text-ink-600">気になるものから、まずは見てみる。</p>
            </div>
            <Link href="/search" className="shrink-0 text-sm font-bold text-brand-600">
              すべて見る <ArrowRight className="inline" size={14} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4">
      <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </span>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{text}</p>
    </div>
  );
}
