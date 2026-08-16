import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Heart,
  Images,
  Palette,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";
import { FIT_CONFIDENCE_LABEL, judgeFit, type Fit, type FitAvoid } from "@/lib/fit";
import { searchProducts, withFitOrder } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

/** おすすめの候補として見る件数。全件は取らない。 */
const SUGGESTION_POOL = 40;

export default async function Home() {
  const supabase = await createClient();
  const user = await getMyUser();

  if (!user || !isRealAccount(user)) {
    const { products } = await searchProducts(supabase, { sort: "rating", limit: 8 });
    return <LandingPage products={products} />;
  }

  const [page, { data: skips }, profile, { data: allergenRows }] = await Promise.all([
    searchProducts(supabase, { sort: "recommended", limit: SUGGESTION_POOL }),
    supabase.from("skipped_purchases").select("saved_yen"),
    getMyProfile(),
    supabase.from("profile_allergens").select("ingredient_id").eq("user_id", user.id),
  ]);

  const allergenIds = (allergenRows ?? []).map((row) => row.ingredient_id);
  const { data: allergenMaster } =
    allergenIds.length > 0
      ? await supabase.from("ingredients_master").select("inci,name_ja").in("id", allergenIds)
      : { data: [] };
  const avoidByInci = new Map(
    (allergenMaster ?? []).map((ingredient) => [
      ingredient.inci.toUpperCase(),
      ingredient.name_ja || ingredient.inci,
    ]),
  );
  const avoidFor = (product: Product): FitAvoid => ({
    registered: allergenIds.length,
    matched: product.ingredients
      .map((ingredient) => avoidByInci.get(ingredient.toUpperCase()))
      .filter((label): label is string => Boolean(label)),
  });

  const hasSkinInfo = Boolean(profile?.skin_type || profile?.skin_tone_hex);
  const suggestions = hasSkinInfo
    ? withFitOrder(page.products, profile)
        .map((product) => ({ product, fit: judgeFit(product, profile, avoidFor(product)) }))
        .filter(({ fit }) => fit.verdict === "good")
        .slice(0, 4)
    : [];

  return (
    <PersonalizedHome
      displayName={profile?.display_name ?? "あなた"}
      hasSkinInfo={hasSkinInfo}
      suggestions={suggestions}
      skipCount={(skips ?? []).length}
      savedYen={(skips ?? []).reduce((total, skip) => total + skip.saved_yen, 0)}
    />
  );
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
            成分・色・口コミから、気になった商品が本当に自分に合うかを判定します。
            数値で確かめて、納得して選べます。
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
          <h2 className="font-display text-2xl font-bold">本当に合うか、3つの視点で確認</h2>
          <p className="mt-1 text-sm text-ink-600">数値で確かめて、自分で選べます。</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      <section className="rounded-2xl border-2 border-ink-900 bg-white p-5">
        <div className="flex items-center gap-2 font-bold">
          <ShieldOff size={17} />
          このアプリは商品を売りません
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          カートも決済もなく、外部ショップへのアフィリエイトリンクも入れていません。
          広告のために並び順を変えることもしません。数えているのは「買わなかった金額」です。
        </p>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

function PersonalizedHome({
  displayName,
  hasSkinInfo,
  suggestions,
  skipCount,
  savedYen,
}: {
  displayName: string;
  hasSkinInfo: boolean;
  suggestions: { product: Product; fit: Fit }[];
  skipCount: number;
  savedYen: number;
}) {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickLink href="/stash" icon={<Heart size={15} />} label="Myポーチ" />
        <QuickLink href="/color" icon={<Palette size={15} />} label="色から探す" />
        <QuickLink href="/feed" icon={<Images size={15} />} label="みんなの投稿" />
        <QuickLink href="/search" icon={<Search size={15} />} label="商品を探す" />
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <CircleDollarSign size={17} className="text-emerald-600" /> 買わなかった金額
        </div>
        <p className="mt-3 font-display text-3xl font-bold tabular-nums text-emerald-700">
          ¥{savedYen.toLocaleString()}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">見送った商品 {skipCount}点</p>
        <Link href="/savings" className="mt-3 inline-block text-sm font-bold text-brand-600">
          買わなかった記録を見る <ArrowRight className="inline" size={14} />
        </Link>
      </section>

      <section className="border-b border-ink-200 pb-6">
        <p className="text-sm text-ink-500">こんにちは、{displayName}さん</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight sm:text-4xl">
          本当に合うものを
          <br />
          見つけよう。
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
          肌情報と手持ちをもとに、あなたに合うものだけを探せます。
        </p>
      </section>

      {hasSkinInfo ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">あなたに合いそうなもの</h2>
              <p className="text-xs text-ink-400">登録した肌の状態・肌の色と、成分表・色番号から選んでいます。</p>
            </div>
            <Link href="/search" className="shrink-0 text-xs font-bold text-brand-600">
              商品を探す
            </Link>
          </div>
          {suggestions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {suggestions.map(({ product, fit }) => (
                <div key={product.id} className="space-y-1.5">
                  <ProductCard product={product} />
                  <p className="px-1 text-xs text-ink-600">
                    {fit.reasons.find((reason) => reason.tone === "plus")?.text ?? fit.headline}
                  </p>
                  <FitBasis fit={fit} />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-ink-200 bg-white p-4 text-sm text-ink-600">
              条件に合う商品をまだ見つけられませんでした。検索から気になる商品を探してみてください。
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <p className="font-bold">肌の状態と肌の色を登録すると、合いそうなものを出せます</p>
          <p className="mt-1 text-xs text-ink-600">
            登録は2項目だけです。手持ちのコスメが0件でも判定できます。
          </p>
          <Link href="/settings" className="mt-3 inline-block text-sm font-bold text-brand-600">
            肌情報を登録する <ArrowRight className="inline" size={14} />
          </Link>
        </section>
      )}
    </div>
  );
}

/** 一覧では「何を根拠に選んだか」を短く出し、未登録の材料は登録導線にする。 */
function FitBasis({ fit }: { fit: Fit }) {
  const used = fit.materials.filter((material) => material.status === "used");
  const missing = fit.materials.filter((material) => material.status === "missing");

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1 text-[11px]">
      <span className="text-ink-400">
        信頼度 {FIT_CONFIDENCE_LABEL[fit.confidence]} ・ 根拠
      </span>
      {used.map((material) => (
        <span
          key={material.key}
          className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-ink-600"
        >
          {material.label}
        </span>
      ))}
      {missing.map((material) => (
        <Link
          key={material.key}
          href={material.href ?? "/settings"}
          className="rounded-full border border-dashed border-brand-300 px-2 py-0.5 font-bold text-brand-700"
        >
          {material.label}を登録
        </Link>
      ))}
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-xl border border-ink-200 px-2.5 py-2 text-xs font-bold text-ink-700"
    >
      {icon}
      {label}
    </Link>
  );
}
