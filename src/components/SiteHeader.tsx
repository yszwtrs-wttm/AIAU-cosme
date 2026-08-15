import Link from "next/link";
import { Sparkles, UserRound } from "lucide-react";
import Avatar from "@/components/Avatar";
import { getMyProfile } from "@/lib/auth";

export default async function SiteHeader({ isRealAccount: real }: { isRealAccount: boolean }) {
  const profile = real ? await getMyProfile() : null;
  const navLinks = real
    ? [
        { href: "/search", label: "商品を探す" },
        { href: "/feed", label: "みんなの投稿" },
        { href: "/stash", label: "Myポーチ" },
      ]
    : [
        { href: "/search", label: "商品を探す" },
        { href: "/feed", label: "みんなの投稿" },
      ];

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white">
            <Sparkles size={16} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">KAWANAI</span>
          <span className="hidden text-[11px] text-ink-400 sm:inline">買わない判断</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-4 text-sm text-ink-600 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-brand-600">
              {label}
            </Link>
          ))}
        </nav>

        {real ? (
          <Link
            href={profile ? "/me" : "/settings"}
            className="ml-auto flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-2 py-1 text-sm md:ml-3"
          >
            <Avatar
              name={profile?.display_name ?? ""}
              hue={profile?.avatar_hue ?? 330}
              avatarUrl={profile?.avatar_url}
              size="sm"
            />
            <span className="max-w-24 truncate sm:max-w-48">
              {profile?.display_name ?? "名前未設定"}
            </span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white md:ml-3"
          >
            <UserRound size={14} />
            ログイン
          </Link>
        )}
      </div>
    </header>
  );
}
