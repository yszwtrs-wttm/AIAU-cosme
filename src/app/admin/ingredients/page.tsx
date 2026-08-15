import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "成分辞書の状態 — KAWANAI" };

/**
 * 成分辞書（別名 → 正規の成分ID）の育ち具合と、引き当てられなかった成分名の一覧。
 *
 * 成分ベースの類似は辞書の質でほぼ決まる。どの表記を取りこぼしているかが見えないと辞書は育たないので、
 * 未正規化の成分名と「似ている別名の候補」をここに出す。
 */
export default async function AdminIngredientsPage() {
  const supabase = await createClient();

  const [{ data: status }, { data: unresolved }] = await Promise.all([
    supabase.from("ingredient_normalization_status").select("*").maybeSingle(),
    supabase.from("unresolved_ingredients").select("*").limit(200),
  ]);

  const total = status?.distinct_ingredient_names ?? 0;
  const resolved = status?.resolved_names ?? 0;
  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const stats = [
    { label: "正規化できた成分名", value: `${resolved} / ${total}` },
    { label: "引き当て率", value: `${rate}%` },
    { label: "別名の登録数", value: `${status?.alias_count ?? 0}` },
    { label: "成分マスタ", value: `${status?.ingredient_count ?? 0} 件` },
  ];

  return (
    <div className="space-y-6">
      <section className="border-b border-ink-200 pb-4">
        <h1 className="font-display text-2xl font-bold">成分辞書の状態</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          全成分表示の文字列を、別名辞書（日本語名・INCI・慣用名）で正規の成分に引き当てています。
          引き当てられなかった名前を辞書に足すほど、成分ベースの類似が正確になります。
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-ink-200 bg-white p-4">
            <div className="text-[11px] text-ink-400">{stat.label}</div>
            <div className="mt-1 font-display text-xl font-bold">{stat.value}</div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-bold">正規化できていない成分名</h2>
          <span className="text-xs text-ink-400">{status?.unresolved_names ?? 0} 件</span>
        </div>

        {(unresolved ?? []).length === 0 ? (
          <p className="rounded-2xl border border-ink-200 bg-white p-4 text-sm text-ink-600">
            すべての成分名が辞書で引き当てられています。
          </p>
        ) : (
          <ul className="space-y-2">
            {(unresolved ?? []).map((row) => (
              <li key={row.name} className="rounded-2xl border border-ink-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-bold">{row.name}</span>
                  <span className="text-xs text-ink-400">{row.product_count ?? 0} 商品</span>
                </div>
                {row.suggested_alias && (
                  <p className="mt-1 text-xs text-ink-600">
                    似ている別名: {row.suggested_alias}
                    <span className="text-ink-400">
                      （類似度 {Math.round((row.suggested_similarity ?? 0) * 100)}%）
                    </span>
                  </p>
                )}
                <p className="mt-1 text-[11px] text-ink-400">
                  {(row.sample_products ?? []).join(" / ")}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[11px] text-ink-400">
          辞書に足すときは ingredient_aliases に（別名, 正規の成分ID）を1行入れてから、
          refresh_ingredient_idf() で成分ベクトルを作り直します。
        </p>
      </section>
    </div>
  );
}
