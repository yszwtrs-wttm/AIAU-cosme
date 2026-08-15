import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { passEvidence, passHeadline, passStats, yen } from "@/lib/pass";
import { createAnonClient } from "@/lib/supabase/anon";
import { CATEGORY_LABEL, PASS_REASON_LABEL, type SharedPass } from "@/lib/types";

async function getPass(shareId: string): Promise<SharedPass | null> {
  // 一覧はできず、share_id を知っている人だけが 1 件読める（security definer の関数）。
  const supabase = createAnonClient();
  const { data } = await supabase.rpc("get_shared_pass", { p_share_id: shareId });
  return ((data ?? []) as SharedPass[])[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const pass = await getPass(shareId);
  if (!pass) return { title: "見送り記録 — KAWANAI" };

  return {
    title: `${passHeadline(pass)} — KAWANAI`,
    description: `${pass.brand} ${pass.name}（${yen(pass.price_yen)}）を見送りました。${passEvidence(pass)}`,
  };
}

export default async function PassPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const pass = await getPass(shareId);
  if (!pass) notFound();

  const stats = passStats(pass);
  const shareText = `${passHeadline(pass)}｜${pass.brand} ${pass.name}（${yen(pass.price_yen)}）`;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border-2 border-brand-500 bg-white">
        <div className="bg-brand-soft p-5">
          <div className="text-[11px] font-bold tracking-widest text-brand-600">見送り記録</div>
          <h1 className="mt-1 font-display text-2xl font-bold leading-snug">
            {passHeadline(pass)}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            {pass.color_hex && (
              <span
                className="swatch inline-block h-12 w-12 shrink-0 rounded-full"
                style={{ background: pass.color_hex }}
              />
            )}
            <div className="min-w-0">
              <div className="text-xs text-ink-400">
                {pass.brand} ・ {CATEGORY_LABEL[pass.category]}
              </div>
              <Link
                href={`/products/${pass.product_id}`}
                className="text-base font-bold hover:text-brand-600"
              >
                {pass.name}
              </Link>
            </div>
          </div>
        </div>

        <ul className="grid grid-cols-1 divide-y divide-ink-100 border-t border-ink-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <li key={stat.label} className="p-4">
              <div className="text-[11px] font-bold text-ink-400">{stat.label}</div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums">{stat.value}</div>
              {stat.unit && <div className="text-[11px] text-ink-600">{stat.unit}</div>}
            </li>
          ))}
        </ul>

        <div className="space-y-1 border-t border-ink-100 p-4 text-xs text-ink-600">
          <p>{passEvidence(pass)}</p>
          <p className="text-ink-400">
            理由: {PASS_REASON_LABEL[pass.reason]} ・ 記録日:{" "}
            {new Date(pass.created_at).toLocaleDateString("ja-JP")}
            {pass.author_handle && (
              <>
                {" "}
                ・{" "}
                <Link href={`/u/${pass.author_handle}`} className="hover:text-brand-600">
                  @{pass.author_handle}
                </Link>
              </>
            )}
          </p>
          <p className="text-ink-400">
            数値は記録した時点のものです。ΔE は CIEDE2000、中身の一致は全成分ベクトルの cosine
            類似度です。
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          X でシェアする
        </a>
        <Link
          href="/search"
          className="rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-600"
        >
          自分の手持ちで確かめる
        </Link>
      </section>
    </div>
  );
}
