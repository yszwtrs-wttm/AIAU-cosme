import Link from "next/link";
import { Sparkles, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, isRealAccount } from "@/lib/auth";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getMyProfile() : null;
  const real = isRealAccount(user);

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 glass">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-white shadow-card">
            <Sparkles size={16} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">KAWANAI</span>
          <span className="hidden text-[11px] text-ink-400 sm:inline">買わない判断</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-4 text-sm text-ink-600 md:flex">
          <Link href="/" className="hover:text-brand-600">探す</Link>
          <Link href="/scan" className="hover:text-brand-600">手持ちを登録</Link>
          <Link href="/stash" className="hover:text-brand-600">ポーチ</Link>
          <Link href="/feed" className="hover:text-brand-600">みんなの投稿</Link>
        </nav>

        {real && profile ? (
          <Link
            href="/me"
            className="ml-auto flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-2 py-1 text-sm md:ml-3"
          >
            <span
              className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white"
              style={{ background: `hsl(${profile.avatar_hue} 70% 62%)` }}
            >
              {profile.display_name.slice(0, 1)}
            </span>
            <span className="max-w-24 truncate">{profile.display_name}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1.5 text-sm font-medium text-white shadow-card md:ml-3"
          >
            <UserRound size={14} />
            ログイン
          </Link>
        )}
      </div>
    </header>
  );
}
