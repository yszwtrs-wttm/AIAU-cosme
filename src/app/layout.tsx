import type { Metadata, Viewport } from "next";
import { Playfair_Display, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import AnonAuth from "@/components/AnonAuth";
import BottomTabBar from "@/components/BottomTabBar";
import SiteHeader from "@/components/SiteHeader";
import ToastProvider from "@/components/Toast";
import WebVitals from "@/components/WebVitals";
import { getMyUser, isRealAccount } from "@/lib/auth";

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getMyUser();
  const real = isRealAccount(user);

  return (
    <html lang="ja" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen text-ink-900 antialiased">
        <ToastProvider>
          <WebVitals />
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
        </ToastProvider>
      </body>
    </html>
  );
}
