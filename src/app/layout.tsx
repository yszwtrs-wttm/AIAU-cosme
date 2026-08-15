import type { Metadata } from "next";
import { Playfair_Display, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import AnonAuth from "@/components/AnonAuth";
import BottomTabBar from "@/components/BottomTabBar";
import SiteHeader from "@/components/SiteHeader";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen text-ink-900 antialiased">
        <AnonAuth />
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-14">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-28 text-[11px] text-ink-400 md:pb-10">
          デモデータです。ブランド名・商品名・口コミはすべて架空で、実在の製品の成分表は使っていません。
        </footer>
        <BottomTabBar />
      </body>
    </html>
  );
}
