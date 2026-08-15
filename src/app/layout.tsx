import type { Metadata, Viewport } from "next";
import { Playfair_Display, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const sans = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KAWANAI — そのコスメ、もう持ってるかも",
  description:
    "手持ちコスメと買おうとしている商品を照らし合わせて、「買わなくていい」を教えてくれるアプリ。",
};

// スマホ利用が前提なので、ノッチ端末でも下タブが安全領域に収まるようにする。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * アプリのヘッダー・タブバーは (app) セグメントに置く。
 * /design のデザイン比較プレビューに本体のシェルが混ざらないようにするため、ここは html/body だけ。
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${sans.variable} ${display.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
