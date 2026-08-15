import Link from "next/link";
import { Home, Search } from "lucide-react";

/** 存在しない商品IDやハンドルでも、アプリのデザインのまま案内する。 */
export default function NotFound() {
  return (
    <section className="animate-rise space-y-5 py-10 text-center">
      <div>
        <p className="text-xs font-bold tracking-widest text-brand-500">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold">ページが見つかりません</h1>
        <p className="mt-2 text-sm text-ink-600">
          URLが変わったか、商品が取り下げられたのかもしれません。探すページから見つけてみてください。
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/search"
          className="flex items-center gap-1.5 rounded-full bg-strong px-5 py-3 text-sm font-bold text-white"
        >
          <Search size={16} />
          商品を探す
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-5 py-3 text-sm font-bold"
        >
          <Home size={16} />
          トップへ
        </Link>
      </div>
    </section>
  );
}
