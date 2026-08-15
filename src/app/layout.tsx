import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAWANAI — 買わなくていい理由を、成分と色の数値で",
  description:
    "手持ちコスメと購入検討中の商品を、全成分ベクトルと CIELAB の色差で突き合わせて「買わなくていい」を証明するアプリ。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
