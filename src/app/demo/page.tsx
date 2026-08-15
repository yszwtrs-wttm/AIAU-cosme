import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import MakeupPlan from "@/components/MakeupPlan";
import ProductThumb from "@/components/ProductThumb";
import { loadDemoPouch } from "@/lib/demo";
import { CATEGORY_LABEL } from "@/lib/types";
import { colorMatchBadge, colorMatchText, formulaMatchText } from "@/lib/wording";

export const metadata = {
  title: "サンプルポーチで試す",
  description: "ログインなしで、被り検出・色カバレッジ・手持ちだけのメイク提案を試せるデモ。",
};

export default async function DemoPage() {
  const { products, overlaps, target, coverage } = await loadDemoPouch();
  const covered = coverage.filter((c) => c.owned_product_id !== null);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-brand-50 px-5 py-6 sm:px-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-600">
          <FlaskConical size={13} /> デモ（サンプルのポーチ）
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">
          あらかじめ用意した{products.length}点のポーチで、
          <br />
          「もう持っている」を見てみる。
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
          これは読み取り専用のサンプルです。登録・削除はできず、あなたのポーチには影響しません。
          自分のコスメで試したくなったら、そのままポーチを作れます。
        </p>
        <Link
          href="/login?mode=signup"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white"
        >
          自分のポーチを作る <ArrowRight size={16} />
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">サンプルポーチの中身</h2>
        <p className="text-xs text-ink-400">タップすると商品ページを見られます（閲覧はログイン不要）。</p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.id}`}
                className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3"
              >
                <ProductThumb
                  category={p.category}
                  colors={[...(p.product_colors ?? [])].sort((a, b) => a.pos - b.pos)}
                  imageUrl={p.image_url}
                  size={48}
                  className="rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-ink-400">
                    {p.brands?.name}
                    <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-brand-600">
                      {CATEGORY_LABEL[p.category]}
                    </span>
                  </div>
                  <div className="truncate text-sm font-bold">{p.name}</div>
                  <div className="text-xs tabular-nums text-ink-600">
                    ¥{p.price_yen.toLocaleString()}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">ポーチの中の被り</h2>
        {overlaps.length > 0 ? (
          <>
            <p className="text-xs text-ink-400">
              成分の並び順から作ったベクトルの近さと、色の差から判定しています。
            </p>
            <ul className="space-y-3">
              {overlaps.map((o) => {
                const cheapLabel = o.a_price <= o.b_price ? o.a_label : o.b_label;
                const cheapPrice = Math.min(o.a_price, o.b_price);
                const diff = Math.abs(o.a_price - o.b_price);
                return (
                  <li
                    key={`${o.a_id}-${o.b_id}`}
                    className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="rounded-full bg-white px-2 py-0.5 text-amber-800">
                        {o.delta_e !== null ? colorMatchBadge(o.delta_e) : "色情報なし"}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-amber-800">
                        {formulaMatchText(o.ing_sim)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                      <Swatch hex={o.a_hex} />
                      <span className="min-w-0">{o.a_label}</span>
                      <span className="text-ink-400">×</span>
                      <Swatch hex={o.b_hex} />
                      <span className="min-w-0">{o.b_label}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-ink-600">
                      {o.delta_e !== null && `${colorMatchText(o.delta_e).title}。`}
                      同じ用途で足りるなら、次に買い足す必要はありません。
                      {diff > 0 &&
                        `安い方（${cheapLabel} ¥${cheapPrice.toLocaleString()}）で済めば、¥${diff.toLocaleString()}の差になります。`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="rounded-2xl border border-ink-200 bg-white p-4 text-sm text-ink-600">
            このサンプルでは被りが見つかりませんでした。
          </p>
        )}
      </section>

      {target && coverage.length > 1 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">迷っている商品を、手持ちで再現できるか</h2>
          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <ProductThumb
                category={target.category}
                colors={[...(target.product_colors ?? [])].sort((a, b) => a.pos - b.pos)}
                imageUrl={target.image_url}
                size={48}
                className="rounded-xl"
              />
              <div className="min-w-0">
                <div className="text-[11px] text-ink-400">{target.brands?.name}</div>
                <Link href={`/products/${target.id}`} className="truncate text-sm font-bold">
                  {target.name}
                </Link>
                <div className="text-xs tabular-nums text-ink-600">
                  ¥{target.price_yen.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className="text-lg font-bold">
                {coverage.length} 色中 {covered.length} 色
              </span>
              <span className="ml-2 text-ink-600">
                は、サンプルポーチのコスメでほぼ同じ色が作れます
              </span>
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {coverage.map((c) => (
                <li key={c.pos} className="flex items-center gap-2 rounded-xl bg-ink-50 p-2 text-xs">
                  <Swatch hex={c.shade_hex} size={24} />
                  <span className="w-24 shrink-0 truncate">{c.shade_name}</span>
                  {c.owned_product_id !== null ? (
                    <span className="flex min-w-0 items-center gap-1.5 text-emerald-800">
                      <Swatch hex={c.owned_hex} />
                      <span className="truncate">
                        {c.owned_label}
                        {c.owned_shade && ` / ${c.owned_shade}`}
                      </span>
                    </span>
                  ) : (
                    <span className="text-ink-400">持っていません</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {products.length > 0 && <MakeupPlan products={products} demo />}

      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <p className="font-bold">ここまでがデモです</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">
          自分のポーチを作ると、同じ判定を自分のコスメで、バーコード登録や商品ページからも使えます。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            自分のポーチを作る <ArrowRight size={15} />
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2.5 text-sm font-bold"
          >
            商品を探す
          </Link>
        </div>
      </section>
    </div>
  );
}

function Swatch({ hex, size = 20 }: { hex: string | null; size?: number }) {
  if (!hex) return null;
  return (
    <span
      className="swatch inline-block shrink-0 rounded-full"
      style={{ background: hex, width: size, height: size }}
    />
  );
}
