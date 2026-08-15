"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./switcher.module.css";

const VARIANTS = [
  { href: "/design", label: "比較トップ" },
  { href: "/design/hallmark", label: "hallmark" },
  { href: "/design/taste", label: "taste-skill" },
  { href: "/design/deslop", label: "kill-ai-slop" },
];

export function Switcher() {
  const pathname = usePathname();

  return (
    <nav className={styles.bar} aria-label="デザインバリアントの切り替え">
      <span className={styles.tag}>preview</span>
      {VARIANTS.map((v) => {
        const current = pathname === v.href;

        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={current ? "page" : undefined}
            className={current ? `${styles.link} ${styles.current}` : styles.link}
          >
            {v.label}
          </Link>
        );
      })}
      <Link href="/" className={styles.app}>
        現行アプリ →
      </Link>
    </nav>
  );
}
