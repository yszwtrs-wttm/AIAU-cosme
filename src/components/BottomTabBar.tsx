"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Images, Search, UserRound } from "lucide-react";

const TABS = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/search", label: "探す", icon: Search },
  { href: "/stash", label: "ポーチ", icon: Heart },
  { href: "/feed", label: "投稿", icon: Images },
  { href: "/me", label: "マイpage", icon: UserRound },
];
const GUEST_TABS = [
  { href: "/search", label: "探す", icon: Search },
  { href: "/feed", label: "投稿", icon: Images },
  { href: "/login", label: "ログイン", icon: UserRound },
];

/** 店頭で片手で使うアプリなので、モバイルではタブバーを主導線にする。 */
export default function BottomTabBar({ isRealAccount }: { isRealAccount: boolean }) {
  const pathname = usePathname();
  const tabs = isRealAccount ? TABS : GUEST_TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-5xl">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${
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
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
