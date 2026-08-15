/**
 * 「使い切ってから買う」ための層。
 *
 * 買い足すかどうかは「持っているか」では決まらない。残っている量と、開封からの経過で決まる。
 * 残量は％では答えられないので3段階にして、開封日はカテゴリごとの使い切り目安と突き合わせる。
 */

import type { Category, RemainingLevel } from "./types";

export const REMAINING_LEVELS: RemainingLevel[] = ["plenty", "half", "low"];

export const REMAINING_LABEL: Record<RemainingLevel, string> = {
  plenty: "たっぷり",
  half: "半分くらい",
  low: "残りわずか",
};

/** 開封してからどれくらいで使い切りたいか（月）。化粧品の開封後の目安。 */
export const OPEN_LIFE_MONTHS: Record<Category, number> = {
  lip: 12,
  eyeshadow: 12,
  foundation: 12,
  bb: 12,
  sunscreen: 6,
  shampoo: 6,
  treatment: 6,
};

export type StashUsage = {
  remaining_level: RemainingLevel;
  opened_at: string | null;
  finished_at: string | null;
};

export function isRemainingLevel(value: unknown): value is RemainingLevel {
  return typeof value === "string" && (REMAINING_LEVELS as string[]).includes(value);
}

/** 開封からの経過月数。未開封（日付なし）は null。 */
export function monthsSinceOpen(openedAt: string | null, now: Date = new Date()): number | null {
  if (!openedAt) return null;
  const opened = new Date(`${openedAt}T00:00:00`);
  if (Number.isNaN(opened.getTime())) return null;
  const months =
    (now.getFullYear() - opened.getFullYear()) * 12 +
    (now.getMonth() - opened.getMonth()) +
    (now.getDate() >= opened.getDate() ? 0 : -1);
  return Math.max(0, months);
}

export type UsageJudgement = {
  /** 開封から目安を過ぎている */
  overdue: boolean;
  /** 残りわずか、または目安を過ぎている。買い足しを許してよい状態 */
  readyToBuy: boolean;
  /** 使い切ったもの */
  finished: boolean;
  /** ポーチのカードに出す一言。無ければ null */
  note: string | null;
  tone: "ok" | "warn" | "done";
};

export function judgeUsage(
  category: Category,
  usage: StashUsage,
  now: Date = new Date(),
): UsageJudgement {
  if (usage.finished_at) {
    return { overdue: false, readyToBuy: true, finished: true, note: "使い切りました", tone: "done" };
  }

  const limit = OPEN_LIFE_MONTHS[category];
  const months = monthsSinceOpen(usage.opened_at, now);
  const overdue = months !== null && months >= limit;
  const low = usage.remaining_level === "low";

  let note: string | null = null;
  if (overdue && low) note = `開封から${months}か月・残りわずかです。使い切りどきです`;
  else if (overdue) note = `開封から${months}か月です。そろそろ使い切りどき`;
  else if (low) note = "残りわずかです。使い切ってから次を選べます";

  return {
    overdue,
    readyToBuy: overdue || low,
    finished: false,
    note,
    tone: overdue || low ? "warn" : "ok",
  };
}

/**
 * 被り判定の言い方を残量で変える。
 * 同じものが「たっぷり」残っているなら買わなくていい。「残りわずか」なら買ってよい。
 */
export function dupeAdviceText(judgement: UsageJudgement): string {
  if (judgement.overdue) {
    return "ただし持っている方は開封から時間が経っています。使い切れなさそうなら、これに買い替える判断もありです。";
  }
  if (judgement.readyToBuy) {
    return "ただし持っている方は残りわずかです。使い切るタイミングなので、これを買っても被りません。";
  }
  if (judgement.finished) {
    return "持っていたものは使い切っています。買い直しなら被りません。";
  }
  return "使い分けたい理由があるなら買う意味はあります。同じ用途で足りるなら、持っている方で済みます。";
}
