import Link from "next/link";
import { DM_Mono, Zen_Kaku_Gothic_New } from "next/font/google";
import { COMPARISONS, LEAD, TOTAL_SAVED, dE1, yen } from "../_demo";
import styles from "./taste.module.css";

const display = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--taste-display",
});

const mono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--taste-mono",
});

/**
 * .agents/skills/taste-skill を適用したトップページ案。
 * design read: premium consumer / redesign-overhaul → VARIANCE 8 / MOTION 5 / DENSITY 4。
 * dark theme lock、アクセントは deep rose 1色、カードではなく罫線と余白でグルーピングする。
 */
export default function TasteVariant() {
  const second = COMPARISONS[1];

  return (
    <div className={`${styles.root} ${display.variable} ${mono.variable}`}>
      <div className={styles.wrap}>
        <nav className={styles.nav}>
          <span className={styles.brand}>KAWANAI</span>
          <div className={styles.navLinks}>
            <Link href="/stash">手持ち</Link>
            <Link href="/color">色から探す</Link>
            <Link href="/scan">登録</Link>
          </div>
        </nav>

        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>ΔE {dE1(LEAD.dE)} / 共通成分 {LEAD.sharedIngredients}</p>
            <h1 className={styles.heroTitle}>
              その新色、
              <br />
              ポーチの中にもう入っている。
            </h1>
            <p className={styles.heroSub}>
              色差と処方の重なりを数値で出して、買う理由が残るかどうかだけを見せます。
            </p>
            <div className={styles.ctaRow}>
              <Link href="/scan" className={styles.primary}>
                手持ちを登録
              </Link>
              <Link href="/stash" className={styles.secondary}>
                被りを見る
              </Link>
            </div>
          </div>

          <div className={styles.proof}>
            <div className={styles.proofSwatches}>
              <div className={styles.proofSwatch} style={{ background: LEAD.owned.hex }}>
                {LEAD.owned.hex}
              </div>
              <div className={styles.proofSwatch} style={{ background: LEAD.candidate.hex }}>
                {LEAD.candidate.hex}
              </div>
            </div>
            <div className={styles.proofMeta}>
              <span className={styles.proofDe}>ΔE {dE1(LEAD.dE)}</span>
              <span className={styles.proofLabel}>
                {LEAD.dELabel}／差額 {yen(LEAD.diffYen)}
              </span>
            </div>
          </div>
        </header>
      </div>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle}>判定は2つの数字だけでできている。</h2>
          <p className={styles.sectionLead}>
            口コミの点数や「人気」は使いません。全成分表示の配合順と、実際の色。どちらも数えられるものです。
          </p>

          <div className={`${styles.split} ${styles.reveal}`}>
            <p className={styles.splitFigure}>ΔE {dE1(LEAD.dE)}</p>
            <p className={styles.splitBody}>
              HEX を CIELAB に変換して CIEDE2000 で距離を取ります。<strong>2 未満なら並べても分からない</strong>
              領域。{LEAD.owned.brand} と {LEAD.candidate.brand} のテラコッタはここに入りました。
            </p>
          </div>

          <div className={`${styles.split} ${styles.splitReversed} ${styles.reveal}`}>
            <p className={styles.splitFigure}>
              {LEAD.sharedIngredients}／{LEAD.ingredientCount}
            </p>
            <p className={styles.splitBody}>
              成分表は配合量の多い順に並ぶので、順番を重みにして 256 次元へ落とします。共通の基剤は IDF
              で寄与を下げるため、<strong>骨格が同じ処方だけが近く出ます</strong>。
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <h2 className={styles.sectionTitle}>シードの3組を、そのまま並べる。</h2>
          <p className={styles.sectionLead}>
            合計 {yen(TOTAL_SAVED)} 分は、色でも処方でも説明がつかない差額でした。
            {second.candidate.brand} のように安い側が同等なら、高い側を買い足す理由は残りません。
          </p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>色</th>
                  <th>手持ち</th>
                  <th>候補</th>
                  <th>ΔE</th>
                  <th>共通成分</th>
                  <th>差額</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map((c) => (
                  <tr key={c.owned.name + c.owned.shade}>
                    <td>
                      <span className={styles.chipPair} aria-hidden="true">
                        <span className={styles.chip} style={{ background: c.owned.hex }} />
                        <span className={styles.chip} style={{ background: c.candidate.hex }} />
                      </span>
                    </td>
                    <td>
                      {c.owned.brand} {c.owned.shade}
                      <br />
                      <span className={styles.num}>{yen(c.owned.priceYen)}</span>
                    </td>
                    <td>
                      {c.candidate.brand} {c.candidate.shade}
                      <br />
                      <span className={styles.num}>{yen(c.candidate.priceYen)}</span>
                    </td>
                    <td className={styles.num}>{dE1(c.dE)}</td>
                    <td className={styles.num}>
                      {c.sharedIngredients}／{c.ingredientCount}
                    </td>
                    <td className={`${styles.num} ${c.diffYen > 0 ? styles.saved : ""}`}>
                      {c.diffYen > 0 ? `−${yen(c.diffYen)}` : `+${yen(-c.diffYen)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <div className={styles.wrap}>
          <h2 className={styles.closingTitle}>1本登録すれば、次の1本を買わない理由が出ます。</h2>
          <Link href="/scan" className={styles.primary}>
            手持ちを登録
          </Link>
        </div>
      </section>

      <div className={styles.wrap}>
        <footer className={styles.footer}>
          <Link href="/design">デザイン比較に戻る</Link>
          <Link href="/">現行アプリ</Link>
          <p className={styles.footerFine}>
            ブランド名・商品名・価格は架空のシードデータです。
          </p>
        </footer>
      </div>
    </div>
  );
}
