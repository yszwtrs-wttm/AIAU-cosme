import Link from "next/link";
import AnonAuth from "@/components/AnonAuth";

const NAV = [
  { href: "/", label: "商品を探す" },
  { href: "/scan", label: "バーコード登録" },
  { href: "/stash", label: "手持ち" },
  { href: "/color", label: "画像から色" },
];

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <AnonAuth />
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            KAWANAI<span className="ml-1 text-xs font-normal text-neutral-500">買わない判断</span>
          </Link>
          <nav className="flex flex-1 gap-4 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-neutral-600 hover:text-neutral-900">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-10 text-xs text-neutral-400">
        デモデータです。ブランド名・商品名・口コミはすべて架空で、実在の製品の成分表は転載していません。
      </footer>
    </div>
  );
}
