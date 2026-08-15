import Link from "next/link";

const VARIANTS = [
  {
    href: "/design/hallmark",
    name: "hallmark",
    upstream: "Nutlope/hallmark",
    read: "genre: editorial / macrostructure: 04 Stat-Led / theme: Almanac",
    decisions: [
      "差額を巨大な数字にして、言葉の見出しと組で置く（Stat-Led）",
      "カードを使わず、hairline の行とタブ数字（tabular-nums）で並べる",
      "OKLCH のトークンのみ。アクセントは1色、面積は3%以下",
      "作った数字は置かない（ΔE はシードデータから実計算）",
    ],
  },
  {
    href: "/design/taste",
    name: "taste-skill",
    upstream: "Leonxlnx/taste-skill",
    read: "design read: premium consumer / redesign-overhaul → VARIANCE 8 · MOTION 5 · DENSITY 4",
    decisions: [
      "中央寄せヒーロー禁止（VARIANCE > 4）→ 分割レイアウト",
      "3等分カード禁止 → 2カラムのジグザグ2回 + 密度の高い比較表",
      "ダークテーマ固定、アクセントは deep rose 1色。Inter とAI紫は使わない",
      "モーションは stagger の1種類だけ。prefers-reduced-motion で停止",
    ],
  },
  {
    href: "/design/deslop",
    name: "kill-ai-slop",
    upstream: "yetone/kill-ai-slop",
    read: "既存コードの audit → 意図的でない tell だけを落とす",
    decisions: [
      "ブランドは変えない。現行の Tailwind と情報設計を維持",
      "rounded-full チップ / backdrop-blur / 入れ子の角丸を廃止",
      "同型カード3列 → 数値が読める行リスト",
      "amber・emerald・red の使い分けをやめ、単色 + 濃度差にする",
    ],
  },
];

export default function DesignIndex() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-2xl font-bold leading-snug">
          「AIっぽいUI」脱却Skillを、同じ画面に3つ当てた比較
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-neutral-700">
          題材は KAWANAI のトップページ。中身のデータ（ΔE・成分の重なり・価格）は 3 案すべて同じで、
          <code className="mx-1 rounded-sm bg-neutral-200 px-1 py-0.5 text-[13px]">supabase/seed.sql</code>
          の実データを
          <code className="mx-1 rounded-sm bg-neutral-200 px-1 py-0.5 text-[13px]">src/lib/color.ts</code>
          で計算しています。違うのは、各 Skill が要求した判断だけです。
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          Skill 本体は <code>.agents/skills/</code> にあります。Devin / Claude Code / Cursor から
          「hallmark で /stash を作り直して」のように名前で呼べます。
        </p>

        <ul className="mt-10 space-y-8">
          {VARIANTS.map((v) => (
            <li key={v.href} className="border-t border-neutral-300 pt-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link href={v.href} className="text-lg font-bold underline decoration-1 underline-offset-4">
                  {v.name}
                </Link>
                <span className="font-mono text-xs text-neutral-500">{v.upstream}</span>
              </div>
              <p className="mt-2 font-mono text-xs text-neutral-500">{v.read}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-neutral-700">
                {v.decisions.map((d) => (
                  <li key={d} className="flex gap-2">
                    <span className="text-neutral-400">—</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <p className="mt-12 border-t border-neutral-300 pt-5 text-xs text-neutral-500">
          プレビュー専用のページで、Supabase には接続していません。現行アプリは{" "}
          <Link href="/" className="underline">
            /
          </Link>{" "}
          です。
        </p>
      </main>
    </div>
  );
}
