import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import BottomTabBar from "@/components/BottomTabBar";
import SiteHeader from "@/components/SiteHeader";
import ToastProvider from "@/components/Toast";
import { getMyUser, isRealAccount } from "@/lib/auth";

const sans = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
  display: "swap",
});

const title = "KAWANAI — 本当に合うコスメを探す";
const description =
  "成分・色・口コミの数値から、その商品が自分に合うかを確かめられるアプリ。";

// OG画像を絶対URLで出すために基準URLが必要。ローカルとプレビューでも壊れないようにフォールバックする。
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "KAWANAI",
  appleWebApp: { capable: true, title: "KAWANAI", statusBarStyle: "default" },
  openGraph: { type: "website", siteName: "KAWANAI", locale: "ja_JP", title, description },
  twitter: { card: "summary_large_image", title, description },
};

// スマホ利用が前提なので、ノッチ端末でも下タブが安全領域に収まるようにする。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#006b76",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getMyUser();
  const real = isRealAccount(user);

  return (
    <html lang="ja" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen text-ink-900 antialiased">
        <ToastProvider>
          <SiteHeader isRealAccount={real} />
          <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-14">{children}</main>
          <footer className="mx-auto max-w-5xl space-y-2 px-4 pb-28 text-[11px] text-ink-500 md:pb-10">
            <p>
              デモデータです。ブランド名・商品名・口コミはすべて架空で、実在の製品の成分表は使っていません。
            </p>
            <p>© {new Date().getFullYear()} Team Cosme. All rights reserved.</p>
          </footer>
          <BottomTabBar isRealAccount={real} />
        </ToastProvider>
      </body>
    </html>
  );
}
