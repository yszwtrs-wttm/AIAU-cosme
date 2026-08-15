import Link from "next/link";
import type { Metadata } from "next";
import styles from "./switcher.module.css";

export const metadata: Metadata = {
  title: "KAWANAI — デザインSkill比較プレビュー",
};

const VARIANTS = [
  { href: "/design", label: "比較トップ" },
  { href: "/design/hallmark", label: "hallmark" },
  { href: "/design/taste", label: "taste-skill" },
  { href: "/design/deslop", label: "kill-ai-slop" },
];

/**
 * プレビュー用の枠。各バリアントの見た目に干渉しないよう、切り替えバー以外は何も足さない。
 */
export default function DesignLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <nav className={styles.bar} aria-label="デザインバリアントの切り替え">
        <span className={styles.tag}>preview</span>
        {VARIANTS.map((v) => (
          <Link key={v.href} href={v.href} className={styles.link}>
            {v.label}
          </Link>
        ))}
        <Link href="/" className={styles.app}>
          現行アプリ →
        </Link>
      </nav>
      {children}
    </>
  );
}
