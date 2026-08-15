"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, TrendingDown } from "lucide-react";
import { markWishlistAlertsRead } from "@/app/actions";
import type { WishlistAlert } from "@/lib/types";
import { colorMatchBadge, formulaMatchText } from "@/lib/wording";

export type AlertView = WishlistAlert & {
  label: string;
  relatedLabel: string | null;
};

/**
 * 通知の文言はここで作る。DB は数値だけを持ち、ΔE や cosine は画面に出さない。
 */
export default function WishlistAlertList({ alerts }: { alerts: AlertView[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const unread = alerts.filter((a) => a.read_at === null).length;

  if (alerts.length === 0) {
    return (
      <p className="rounded-2xl border border-ink-200 bg-white p-4 text-sm text-ink-600">
        通知はまだありません。ポーチに手持ちを追加したときの被りと、値下がりをここに出します。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {unread > 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markWishlistAlertsRead();
              router.refresh();
            })
          }
          className="text-xs font-bold text-brand-600 underline disabled:opacity-50"
        >
          {pending ? "処理中…" : `未読 ${unread} 件をまとめて既読にする`}
        </button>
      )}

      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link
              href={`/products/${alert.product_id}`}
              className={`flex gap-3 rounded-2xl border p-3 text-sm ${
                alert.read_at === null
                  ? "border-plum-300 bg-plum-100"
                  : "border-ink-200 bg-white"
              }`}
            >
              <span className="mt-0.5 shrink-0 text-plum-700">
                {alert.kind === "price_drop" ? <TrendingDown size={18} /> : <BellRing size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{alert.label}</span>
                <span className="mt-0.5 block text-xs text-ink-600">
                  {alert.kind === "overlap" ? (
                    <>
                      手持ちに入れた「{alert.relatedLabel}」と
                      {alert.ing_sim !== null ? formulaMatchText(alert.ing_sim) : "似ています"}
                      {alert.delta_e !== null && `。色は${colorMatchBadge(alert.delta_e)}`}。
                      買わなくて足りるかもしれません。
                    </>
                  ) : (
                    <>
                      ¥{(alert.old_price_yen ?? 0).toLocaleString()} → ¥
                      {(alert.new_price_yen ?? 0).toLocaleString()}に値下がりしました（−¥
                      {((alert.old_price_yen ?? 0) - (alert.new_price_yen ?? 0)).toLocaleString()}）。
                    </>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
