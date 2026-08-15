import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, PiggyBank, ShieldOff } from "lucide-react";
import ProductThumb from "@/components/ProductThumb";
import UnskipButton from "@/components/UnskipButton";
import { getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_LABEL,
  SKIP_REASON_LABEL,
  type SkipReason,
  type SkippedPurchase,
} from "@/lib/types";

const PRODUCT_SELECT =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

const REASON_ORDER: SkipReason[] = [
  "own_similar_color",
  "own_similar_formula",
  "cheaper_alternative",
  "not_fit",
  "other",
];

/**
 * 「買わなかった」を1画面で見せるダッシュボード。
 * 金額は見送った時点の価格をそのまま足したもので、割引や値上げの推定はしない。
 */
export default async function SavingsPage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("skipped_purchases")
    .select(`id,product_id,price_yen,saved_yen,reason,evidence_product_id,evidence_price_yen,created_at,products(${PRODUCT_SELECT})`)
    .order("created_at", { ascending: false })
    .returns<SkippedPurchase[]>();

  const skips = data ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = skips.filter((skip) => new Date(skip.created_at) >= monthStart);

  const monthTotal = sum(thisMonth.map((skip) => skip.saved_yen));
  const allTotal = sum(skips.map((skip) => skip.saved_yen));

  const breakdown = REASON_ORDER.map((reason) => {
    const rows = skips.filter((skip) => skip.reason === reason);
    return { reason, count: rows.length, saved: sum(rows.map((row) => row.saved_yen)) };
  }).filter((row) => row.count > 0);
  const breakdownMax = Math.max(1, ...breakdown.map((row) => row.saved));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl font-bold">買わなかった記録</h1>
        <p className="mt-1 text-sm text-ink-600">
          見送った金額は、見送った時点の価格です。似ていて安いものにした場合は差額だけを数えています。
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={`${now.getMonth() + 1}月に見送った金額`}
          value={`¥${monthTotal.toLocaleString()}`}
          note={`${thisMonth.length}件`}
          highlight
        />
        <StatCard
          label="累計の節約額"
          value={`¥${allTotal.toLocaleString()}`}
          note={`${skips.length}件`}
        />
        <StatCard
          label="見送った商品"
          value={`${skips.length}点`}
          note={skips.length > 0 ? "内訳は下に出ています" : "まだありません"}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">見送った理由の内訳</h2>
        {breakdown.length === 0 ? (
          <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
            まだ記録がありません。商品ページの「買わずに見送る」を押すと、理由と金額がここに積まれます。
          </p>
        ) : (
          <ul className="space-y-2.5 rounded-2xl border border-ink-200 bg-white p-4">
            {breakdown.map(({ reason, count, saved }) => (
              <li key={reason}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-bold">{SKIP_REASON_LABEL[reason]}</span>
                  <span className="shrink-0 tabular-nums text-ink-600">
                    ¥{saved.toLocaleString()}
                    <span className="ml-1.5 text-xs text-ink-400">{count}件</span>
                  </span>
                </div>
                <span className="mt-1 block h-2.5 rounded-full bg-ink-100">
                  <span
                    className="block h-2.5 rounded-full bg-brand-500"
                    style={{ width: `${Math.round((saved / breakdownMax) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">見送った商品</h2>
        {skips.length === 0 ? (
          <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
            気になった商品のページで、手持ちとの被りや安い代替を見てから決められます。
            <Link href="/search" className="ml-1 font-bold text-brand-600">
              商品を探す <ArrowRight className="inline" size={13} />
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {skips.map((skip) => (
              <li
                key={skip.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3"
              >
                {skip.products && (
                  <ProductThumb
                    category={skip.products.category}
                    colors={skip.products.product_colors ?? []}
                    imageUrl={skip.products.image_url}
                    size={56}
                    className="shrink-0 rounded-xl"
                  />
                )}
                <div className="min-w-40 flex-1">
                  <div className="text-[11px] text-ink-400">
                    {skip.products?.brands?.name}
                    {skip.products && ` ・ ${CATEGORY_LABEL[skip.products.category]}`}
                  </div>
                  <Link
                    href={`/products/${skip.product_id}`}
                    className="text-sm font-bold hover:text-brand-600"
                  >
                    {skip.products?.name ?? `商品 #${skip.product_id}`}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700">
                      {SKIP_REASON_LABEL[skip.reason]}
                    </span>
                    <span className="text-ink-400">
                      {new Date(skip.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-bold tabular-nums text-emerald-700">
                    ¥{skip.saved_yen.toLocaleString()}
                  </div>
                  {skip.saved_yen !== skip.price_yen && (
                    <div className="text-[10px] text-ink-400">
                      定価 ¥{skip.price_yen.toLocaleString()} との差額
                    </div>
                  )}
                  <UnskipButton productId={skip.product_id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border-2 border-ink-900 bg-white p-5">
        <div className="flex items-center gap-2 font-bold">
          <ShieldOff size={17} className="text-ink-900" />
          KAWANAI は商品を売りません
        </div>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-600">
          <li>・アプリ内に販売機能（カート・決済）はありません。</li>
          <li>・外部ショップへのアフィリエイトリンクも入れていません。</li>
          <li>・広告のために商品の並び順を変えることもしません。</li>
          <li>・成果として数えているのは「買った金額」ではなく、この画面の「買わなかった金額」です。</li>
        </ul>
      </section>
    </div>
  );
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function StatCard({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-brand-300 bg-brand-50" : "border-ink-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-ink-500">
        <PiggyBank size={14} className={highlight ? "text-brand-600" : "text-ink-400"} />
        {label}
      </div>
      <div className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-400">{note}</div>
    </div>
  );
}
