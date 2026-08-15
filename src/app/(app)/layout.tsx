import AnonAuth from "@/components/AnonAuth";
import BottomTabBar from "@/components/BottomTabBar";
import SiteHeader from "@/components/SiteHeader";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen text-ink-900">
      <AnonAuth />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-14">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-28 text-[11px] text-ink-400 md:pb-10">
        デモデータです。ブランド名・商品名・口コミはすべて架空で、実在の製品の成分表は使っていません。
      </footer>
      <BottomTabBar />
    </div>
  );
}
