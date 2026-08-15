import Link from "next/link";
import { IBM_Plex_Mono, Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from "next/font/google";
import { COMPARISONS, LEAD, TOTAL_SAVED, dE1, yen } from "../_demo";
import styles from "./hallmark.module.css";

const display = Shippori_Mincho_B1({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
  variable: "--hallmark-display",
});

const body = Zen_Kaku_Gothic_New({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--hallmark-body",
});

const figure = IBM_Plex_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--hallmark-figure",
});

/**
 * .agents/skills/hallmark を適用したトップページ案。
 * genre: editorial / macrostructure: 04 Stat-Led / theme: Almanac。
 * 数字はすべて supabase/seed.sql の実データを src/lib/color.ts で計算したもの（作文しない）。
 */
export default function HallmarkVariant() {
  return (
    <div
      className={`${styles.root} ${display.variable} ${body.variable} ${figure.variable}`}
    >
      <div className={styles.wrap}>
        <nav className={styles.nav}>
          <span className={styles.wordmark}>KAWANAI</span>
          <div className={styles.navLinks}>
            <Link href="/scan">手持ちを登録</Link>
            <Link href="/stash">被りを見る</Link>
          </div>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroFigureBlock}>
            <p className={styles.kicker}>手持ち3本を安い同等品に置き換えた場合の差額</p>
            <span className={styles.figure}>
              {TOTAL_SAVED.toLocaleString("ja-JP")}
              <span className={styles.figureUnit}>円</span>
            </span>
          </div>
          <div className={styles.heroSide}>
            <h1 className={styles.heroLine}>
              同じ色、同じ骨格の処方。差額だけが違った。
            </h1>
            <p className={styles.heroNote}>
              色差は CIELAB の ΔE(CIEDE2000)、処方は全成分表示の配合順から作ったベクトルの cosine
              類似度。判定は Supabase の Postgres 関数の中で完結している。
            </p>
            <Link href="/scan" className={styles.cta}>
              手持ちを1本登録して試す
            </Link>
          </div>
        </header>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>3組の内訳</h2>
            <p>
              左が手持ち、右が候補。ΔE 2 未満は並べても見分けがつかない領域で、成分の重なりが多いほど
              「同じものを2つ持っている」に近づく。
            </p>
          </div>

          <div className={styles.rows}>
            {COMPARISONS.map((c) => (
              <article key={c.owned.name + c.owned.shade} className={styles.row}>
                <div>
                  <p className={styles.rowFigure}>
                    ΔE {dE1(c.dE)}
                    <small>{c.dELabel}</small>
                  </p>
                  <div className={styles.swatchPair} aria-hidden="true">
                    <span className={styles.swatch} style={{ background: c.owned.hex }} />
                    <span className={styles.swatch} style={{ background: c.candidate.hex }} />
                  </div>
                </div>

                <div className={styles.pair}>
                  <p className={styles.item}>
                    <span className={styles.itemLabel}>手持ち</span>
                    <span>
                      {c.owned.brand}／{c.owned.name} {c.owned.shade}{" "}
                      <span className={styles.price}>{yen(c.owned.priceYen)}</span>
                    </span>
                  </p>
                  <p className={styles.item}>
                    <span className={styles.itemLabel}>候補</span>
                    <span>
                      {c.candidate.brand}／{c.candidate.name} {c.candidate.shade}{" "}
                      <span className={styles.price}>{yen(c.candidate.priceYen)}</span>
                    </span>
                  </p>
                  <p className={styles.item}>
                    <span className={styles.itemLabel}>成分</span>
                    <span>
                      共通 {c.sharedIngredients} / {c.ingredientCount} 成分
                    </span>
                  </p>
                </div>

                <p className={styles.verdict}>
                  {c.diffYen > 0 ? (
                    <>
                      候補のほうが{" "}
                      <span className={styles.verdictStrong}>{yen(c.diffYen)}</span> 安い。
                      {c.dE < 2
                        ? "色は見分けられない。"
                        : c.dE < 5
                          ? "単体で見れば同じ色に見える。"
                          : "色は別物なので、買い替えではなく別枠。"}
                    </>
                  ) : (
                    <>候補のほうが {yen(-c.diffYen)} 高い。乗り換える理由はない。</>
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>数字の出どころ</h2>
            <p>作った数字は置かない。ここに書いた式がそのまま実装で、上の表はその出力。</p>
          </div>

          <div className={styles.method}>
            <div>
              <h3>処方ベクトル</h3>
              <p>
                全成分表示は配合量の多い順に並ぶので、配合順を重みにして 256 次元へハッシュする。
                水・BG・グリセリンのような共通の基剤は IDF で寄与を落とす。
              </p>
              <p className={styles.formula}>w_i = (1 / log2(i + 2)) * idf(ingredient)</p>
            </div>
            <div>
              <h3>色差</h3>
              <p>
                HEX を CIELAB に変換し、CIEDE2000 で ΔE を取る。先頭の組は ΔE {dE1(LEAD.dE)}、
                {LEAD.dELabel}。ΔE 5 を超えたものは「似た色」とは呼ばない。
              </p>
              <p className={styles.formula}>lab_delta_e(lab_a, lab_b) → ΔE00</p>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <ul className={styles.footerIndex}>
            <li>
              <Link href="/scan">
                バーコードで登録<span>01</span>
              </Link>
            </li>
            <li>
              <Link href="/stash">
                手持ちの被り<span>02</span>
              </Link>
            </li>
            <li>
              <Link href="/color">
                画像の色から探す<span>03</span>
              </Link>
            </li>
            <li>
              <Link href="/design">
                デザイン比較に戻る<span>04</span>
              </Link>
            </li>
          </ul>
          <p className={styles.fine}>
            ブランド名・商品名・価格はすべて架空のシードデータ。実在製品の成分表は転載していない。
          </p>
        </footer>
      </div>
    </div>
  );
}
