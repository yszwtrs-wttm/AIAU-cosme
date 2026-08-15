import type { Metadata, Viewport } from "next";
import { Playfair_Display, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import AnonAuth from "@/components/AnonAuth";
import BottomTabBar from "@/components/BottomTabBar";
import SiteHeader from "@/components/SiteHeader";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";

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
  metadataBase: new URL(siteUrl()),
  // 各ページは title だけを返せば「〜 ｜ もう持ってるかも」に揃う。
  title: {
    default: `${SITE_NAME} — そのコスメ、${SITE_TAGLINE}`,
    template: `%s ｜ ${SITE_TAGLINE}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ja_JP",
    title: `${SITE_NAME} — そのコスメ、${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

// スマホ利用が前提なので、ノッチ端末でも下タブが安全領域に収まるようにする。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getMyUser();
  const real = isRealAccount(user);

  return (
    <html lang="ja" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen text-ink-900 antialiased">
        <AnonAuth />
        <SiteHeader isRealAccount={real} />
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-14">{children}</main>
        <footer className="mx-auto max-w-5xl space-y-2 px-4 pb-28 text-[11px] text-ink-400 md:pb-10">
          <p>
            デモデータです。ブランド名・商品名・口コミはすべて架空で、実在の製品の成分表は使っていません。
          </p>
          <p>© {new Date().getFullYear()} Team Cosme. All rights reserved.</p>
        </footer>
        <BottomTabBar isRealAccount={real} />
      </body>
    </html>
  );
}
