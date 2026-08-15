import Link from "next/link";
import { Globe, Link2, Lock } from "lucide-react";
import { STASH_VISIBILITY_HINT, STASH_VISIBILITY_LABEL } from "@/lib/types";

export const metadata = {
  title: "公開範囲とプライバシー — KAWANAI",
  description: "KAWANAI で何が公開され、何が公開されないかの説明。",
};

const VISIBILITY = [
  { key: "public" as const, Icon: Globe },
  { key: "link" as const, Icon: Link2 },
  { key: "private" as const, Icon: Lock },
];

const PUBLIC_ITEMS = [
  "表示名・ユーザーID・アイコン・ひとこと",
  "肌のトーン / 肌の状態 / パーソナルカラー（登録した場合）",
  "投稿した口コミと、口コミに付けた写真",
];

const PRIVATE_ITEMS = [
  "メールアドレスとパスワード",
  "避けたい成分（肌の悩みに近い情報なので、本人以外は読めません）",
  "非公開にしているポーチの中身",
  "バーコードで読んだ・手で登録したといった登録のしかた",
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">公開範囲とプライバシー</h1>
        <p className="text-sm text-ink-600">
          手持ちコスメ（ポーチ）は買ったものの記録に近い情報です。だから KAWANAI
          は、ポーチを既定で非公開にしています。公開するかどうかは、あとから何度でも変えられます。
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">ポーチの公開範囲</h2>
        <ul className="space-y-2">
          {VISIBILITY.map(({ key, Icon }) => (
            <li key={key} className="rounded-2xl border border-ink-200 bg-white p-4">
              <div className="flex items-center gap-1.5 text-sm font-bold">
                <Icon size={15} className="text-brand-600" />
                {STASH_VISIBILITY_LABEL[key]}
                {key === "private" && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] text-brand-700">
                    既定
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-600">{STASH_VISIBILITY_HINT[key]}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-600">
          公開に切り替える前に、
          <Link href="/settings" className="text-brand-700 underline">
            プロフィール設定
          </Link>
          のプレビューで「ほかの人に何が見えるか」をそのまま確認できます。
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-ink-200 bg-white p-4">
          <h2 className="text-sm font-bold">ユーザーページに出るもの</h2>
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink-600">
            {PUBLIC_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 rounded-2xl border border-ink-200 bg-white p-4">
          <h2 className="text-sm font-bold">誰にも見せないもの</h2>
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink-600">
            {PRIVATE_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-ink-200 bg-white p-4">
        <h2 className="font-display text-lg font-bold">どう守っているか</h2>
        <ul className="list-disc space-y-1 pl-4 text-sm text-ink-600">
          <li>
            ポーチ（<code className="text-xs">user_items</code>）の読み取りは Postgres の行単位セキュリティ
            (RLS) で制限しています。本人以外が読めるのは、公開範囲が「全体に公開」のときだけです。
          </li>
          <li>
            「リンクを知っている人だけ」は、推測できない共有トークンを本人しか読めない別テーブルに置き、
            照合だけをサーバー側の関数で行います。リンクは作り直せて、古いリンクはその時点で見られなくなります。
          </li>
          <li>避けたい成分は、本人のみ読み書きできるポリシーにしています。</li>
          <li>口コミの信頼度スコアや除外理由は内部の集計にだけ使い、画面には出しません。</li>
        </ul>
      </section>

      <p className="text-sm">
        <Link href="/settings" className="text-brand-700 underline">
          プロフィール設定で公開範囲を変える
        </Link>
      </p>
    </div>
  );
}
