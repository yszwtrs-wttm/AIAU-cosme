/**
 * 口コミ本文の整形。表示・保存・DB の CHECK 制約で同じ上限を使う。
 * 改行だけの水増しや末尾の空白で文字数が変わらないように、投稿前に正規化する。
 */
export const REVIEW_BODY_MAX = 1000;

export function normalizeReviewBody(body: string): string {
  return body
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\u3000]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
