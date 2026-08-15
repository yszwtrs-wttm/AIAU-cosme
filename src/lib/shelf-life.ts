/**
 * 開封後の使用期限の目安と、「使い切りたい順」の並べ方。
 *
 * 期限は商品ごとに書かれていないことが多いので、カテゴリ別の一般的な目安を使う。
 * 出典:
 *   - U.S. FDA "Shelf Life and Expiration Dating of Cosmetics"
 *     https://www.fda.gov/cosmetics/cosmetic-products/shelf-life-expiration-dating-cosmetics
 *     （マスカラなど目のまわりは開封後3か月、その他は開封後に品質が落ちていく）
 *   - 日本化粧品工業会「化粧品Q&A」
 *     https://www.jcia.org/user/public/knowledge/qa
 *     （未開封で3年以上品質を保てるものは期限表示が不要。開封後は数か月〜1年が目安）
 *
 * 数値は「これを過ぎたら危険」ではなく「そろそろ使い切りたい」の線引きとして扱う。
 */

import type { Category } from "./types";

/** カテゴリ別・開封後に使い切りたい月数の目安。 */
export const SHELF_LIFE_MONTHS: Record<Category, number> = {
  lip: 12,
  foundation: 12,
  bb: 12,
  // パウダーは水分が少なく傷みにくいので長め。
  eyeshadow: 24,
  // 開封後はそのシーズン中に使い切るのが目安。
  sunscreen: 12,
  shampoo: 12,
  treatment: 12,
};

export const SHELF_LIFE_SOURCE_LABEL = "出典: FDA / 日本化粧品工業会（カテゴリ別の一般的な目安）";

/** 残量はざっくり3段階。DB は 0〜100 の整数なので代表値に寄せる。 */
export const REMAINING_LEVELS = [
  { pct: 100, label: "たっぷり" },
  { pct: 50, label: "半分くらい" },
  { pct: 15, label: "わずか" },
] as const;

export type RemainingLevel = (typeof REMAINING_LEVELS)[number]["pct"];

/** 任意の残量%を3段階のどれかに寄せる。 */
export function toRemainingLevel(pct: number): RemainingLevel {
  if (pct <= 25) return 15;
  if (pct <= 70) return 50;
  return 100;
}

export function remainingLabel(pct: number): string {
  const level = toRemainingLevel(pct);
  return REMAINING_LEVELS.find((l) => l.pct === level)!.label;
}

export type StashUsage = {
  opened_at: string | null;
  purchased_at: string | null;
  remaining_pct: number;
  purchase_price_yen: number | null;
  note: string | null;
};

export type UseUpState =
  /** 目安を過ぎている */
  | "over"
  /** 1か月以内に目安が来る */
  | "soon"
  /** まだ余裕がある */
  | "ok"
  /** 開封日が未入力で判定できない */
  | "unknown";

export type UseUpStatus = {
  state: UseUpState;
  /** 目安の日付（開封日 + カテゴリの月数）。開封日が無ければ null */
  useByDate: Date | null;
  daysLeft: number | null;
  months: number;
  label: string;
  /** 「使い切りたい順」の並べ替えキー。小さいほど先に使いたい */
  sortKey: number;
};

const DAY_MS = 86_400_000;

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function remainingText(days: number): string {
  if (days >= 60) return `あと約${Math.round(days / 30)}か月`;
  if (days >= 14) return `あと約${Math.round(days / 7)}週間`;
  return `あと${days}日`;
}

/**
 * 開封日とカテゴリから「そろそろ使い切りたいか」を出す。
 * 残量が少ないものは同じ期限でも先に片付けたいので、並べ替えキーだけ少し前に出す。
 */
export function judgeUseUp(
  category: Category,
  usage: StashUsage,
  now: Date = new Date(),
): UseUpStatus {
  const months = SHELF_LIFE_MONTHS[category];
  const today = startOfDay(now);

  if (!usage.opened_at) {
    return {
      state: "unknown",
      useByDate: null,
      daysLeft: null,
      months,
      label: `開封日を入れると、${months}か月の目安から使い切り時期が出ます`,
      sortKey: Number.MAX_SAFE_INTEGER,
    };
  }

  const opened = startOfDay(new Date(`${usage.opened_at}T00:00:00`));
  const useByDate = addMonths(opened, months);
  const daysLeft = Math.round((startOfDay(useByDate).getTime() - today.getTime()) / DAY_MS);
  // 残量わずかなものは、同じ期限なら先に出す（使い切れば買い足しの判断もできる）。
  const remainingBonus = toRemainingLevel(usage.remaining_pct) === 15 ? -14 : 0;

  if (daysLeft < 0) {
    return {
      state: "over",
      useByDate,
      daysLeft,
      months,
      label: `目安の${months}か月を${-daysLeft}日過ぎています`,
      sortKey: daysLeft + remainingBonus,
    };
  }

  return {
    state: daysLeft <= 30 ? "soon" : "ok",
    useByDate,
    daysLeft,
    months,
    label: `${months}か月の目安まで${remainingText(daysLeft)}`,
    sortKey: daysLeft + remainingBonus,
  };
}

export const USE_UP_TONE: Record<UseUpState, string> = {
  over: "border-red-200 bg-red-50 text-red-700",
  soon: "border-amber-200 bg-amber-50 text-amber-700",
  ok: "border-ink-200 bg-white text-ink-600",
  unknown: "border-ink-200 bg-ink-50 text-ink-400",
};

export const USE_UP_BADGE: Record<UseUpState, string> = {
  over: "期限の目安を過ぎています",
  soon: "そろそろ使い切りたい",
  ok: "まだ余裕あり",
  unknown: "開封日 未入力",
};
