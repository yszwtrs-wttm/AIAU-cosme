"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, Home, Images, Search, UserRound } from "lucide-react";
import { readSearchQuery } from "@/lib/browsing";

const TABS = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/search", label: "探す", icon: Search },
  { href: "/feed", label: "投稿", icon: Images },
  { href: "/stash", label: "Myポーチ", icon: Heart },
  { href: "/me", label: "マイpage", icon: UserRound },
];
const GUEST_TABS = [
  { href: "/search", label: "探す", icon: Search },
  { href: "/feed", label: "投稿", icon: Images },
  { href: "/login", label: "ログイン", icon: UserRound },
];

/**
 * 店頭で片手で使うアプリなので、モバイルではタブバーを主導線にする。
 * 動的ページは既定だと loading.tsx までしか先読みしないので、主導線は中身まで先読みする。
 */
export default function BottomTabBar({ isRealAccount }: { isRealAccount: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabs = isRealAccount ? TABS : GUEST_TABS;
  // 探すタブは直近の絞り込みに戻す。一覧にいる間は今の絞り込みがそのまま直近。
  const currentQuery = pathname === "/search" ? searchParams.toString() : null;
  const [storedQuery, setStoredQuery] = useState("");

  useEffect(() => {
    setStoredQuery(readSearchQuery());
  }, [pathname, searchParams]);

  const query = currentQuery ?? storedQuery;
  const searchHref = query ? `/search?${query}` : "/search";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-5xl">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href === "/search" ? searchHref : href}
                prefetch
                className={`flex flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] ${
                  active ? "text-brand-600" : "text-ink-400"
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-xl ${
                    active ? "bg-brand-600 text-white" : ""
                  }`}
                >
                  <Icon size={17} />
                </span>
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
