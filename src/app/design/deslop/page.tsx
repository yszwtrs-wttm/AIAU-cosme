import Link from "next/link";
import { COMPARISONS, TOTAL_SAVED, dE1, yen } from "../_demo";

/**
 * .agents/skills/kill-ai-slop を現行トップページに当てた版。
 * ブランドを作り替えるのではなく、scan.mjs が挙げた tell を落とすだけに留める（同じ Tailwind、同じ情報設計）。
 * 落としたもの: 19 max-radius/glassmorphism, 21 corners that don't nest, 28 all-caps card grid,
 * 15 emoji everywhere, 32 one gap everywhere, 一色しかない semantic box。
 */

const FIXED = [
  ["19 max-radius / glassmorphism", "rounded-full のチップと backdrop-blur を廃止。角丸は 2px 一段だけ"],
  ["21 corners that don't nest", "入れ子の rounded-2xl を廃止し、境界は 1px の罫線で表す"],
  ["28 all-caps card grid", "同型カード3列 → 数値が読める行リスト"],
  ["15 emoji everywhere", "★ の連打 → 件数と数値"],
  ["32 one gap everywhere", "space-y-6 の一律間隔 → 関係の近さで 8/16/40px を打ち分け"],
  ["semantic palette", "amber / emerald / red の使い分け → 単色アクセント + 濃度差"],
];

const CATEGORIES = [
  ["リップ", true],
  ["アイシャドウ", false],
  ["ファンデ", false],
  ["シャンプー", false],
  ["メンズ", false],
] as const;

export default function DeslopVariant() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-300">
        <div className="mx-auto flex max-w-4xl items-baseline gap-6 px-4 py-4">
          <span className="text-base font-bold tracking-tight">KAWANAI</span>
          <nav className="ml-auto flex gap-5 text-sm text-neutral-600">
            <Link href="/scan" className="hover:text-neutral-900">
              登録
            </Link>
            <Link href="/stash" className="hover:text-neutral-900">
              手持ち
            </Link>
            <Link href="/color" className="hover:text-neutral-900">
              色から探す
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4">
        <section className="border-b border-neutral-300 py-10">
          <h1 className="max-w-xl text-3xl font-bold leading-tight">
            「買わなくていい」を、成分と色の数値で証明する。
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-neutral-700">
            全成分表示の配合順から作った処方ベクトルの cosine 類似度と、CIELAB の ΔE(CIEDE2000)。
            この2つで、ポーチの中身といま買おうとしている商品を突き合わせます。
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/scan"
              className="rounded-sm bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800"
            >
              バーコードで登録
            </Link>
            <Link
              href="/stash"
              className="rounded-sm border border-neutral-400 px-4 py-2 hover:border-neutral-900"
            >
              手持ちの被りを見る
            </Link>
          </div>
        </section>

        <section className="border-b border-neutral-300 py-8">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {CATEGORIES.map(([label, active]) => (
              <span
                key={label}
                className={
                  active
                    ? "border-b-2 border-neutral-900 pb-1 font-medium"
                    : "border-b-2 border-transparent pb-1 text-neutral-500"
                }
              >
                {label}
              </span>
            ))}
          </div>

          <p className="mt-2 text-xs text-neutral-500">
            シードの3組。手持ち側を安い同等品に置き換えると合計 {yen(TOTAL_SAVED)} 浮きます。
          </p>

          <ul className="mt-4 divide-y divide-neutral-200 border-t border-neutral-200">
            {COMPARISONS.map((c) => (
              <li key={c.owned.name + c.owned.shade} className="flex flex-wrap gap-x-6 gap-y-2 py-4">
                <span className="flex" aria-hidden="true">
                  <span className="h-10 w-10 border border-neutral-300" style={{ background: c.owned.hex }} />
                  <span
                    className="h-10 w-10 border border-l-0 border-neutral-300"
                    style={{ background: c.candidate.hex }}
                  />
                </span>

                <span className="min-w-[15rem] flex-1 text-sm">
                  <span className="block font-medium">
                    {c.owned.brand} {c.owned.name} {c.owned.shade}
                  </span>
                  <span className="block text-neutral-600">
                    → {c.candidate.brand} {c.candidate.name} {c.candidate.shade}
                  </span>
                </span>

                <span className="text-sm tabular-nums">
                  <span className="block">ΔE {dE1(c.dE)}</span>
                  <span className="block text-neutral-500">{c.dELabel}</span>
                </span>

                <span className="text-sm tabular-nums">
                  <span className="block">
                    共通 {c.sharedIngredients}／{c.ingredientCount} 成分
                  </span>
                  <span className="block text-neutral-500">
                    {yen(c.owned.priceYen)} → {yen(c.candidate.priceYen)}
                  </span>
                </span>

                <span
                  className={
                    c.diffYen > 0
                      ? "text-sm font-medium tabular-nums text-neutral-900"
                      : "text-sm tabular-nums text-neutral-500"
                  }
                >
                  {c.diffYen > 0 ? `−${yen(c.diffYen)}` : `+${yen(-c.diffYen)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="py-8">
          <h2 className="text-base font-bold">この画面で外した tell</h2>
          <p className="mt-1 text-xs text-neutral-500">
            node .agents/skills/kill-ai-slop/scripts/scan.mjs src の出力から、意図的でないものだけを落としています。
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            {FIXED.map(([tell, fix]) => (
              <div key={tell} className="flex flex-wrap gap-x-3">
                <dt className="w-56 font-mono text-xs text-neutral-500">{tell}</dt>
                <dd className="flex-1 text-neutral-700">{fix}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-neutral-300">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-4 px-4 py-6 text-xs text-neutral-500">
          <Link href="/design" className="hover:text-neutral-900">
            デザイン比較に戻る
          </Link>
          <Link href="/" className="hover:text-neutral-900">
            現行アプリ
          </Link>
          <p>ブランド名・商品名・価格は架空のシードデータです。</p>
        </div>
      </footer>
    </div>
  );
}
