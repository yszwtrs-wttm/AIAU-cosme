/**
 * 価格の見せ方。
 *
 * KAWANAI は販売リンクを持たないので、表示するのは実売価格ではなく参考価格になる。
 * 「どこの価格か（出典）」「いつ時点か」「容量あたりいくらか（単価）」を価格に添えて、
 * 「こっちが安い」の根拠がたどれる状態にする。
 */

/** 価格の性質とアフィリエイト非搭載の明示。価格を出す画面で必ず添える。 */
export const PRICE_DISCLAIMER =
  "価格は出典時点の参考価格です。販売店の実売価格とは異なる場合があります。KAWANAI は販売リンク・アフィリエイトを掲載していません。";

/** 「2026/8/19 時点」。日付が無ければ null。 */
export function priceCheckedAtText(checkedAt: string | null | undefined): string | null {
  if (!checkedAt) return null;
  // タイムゾーンでずらしたくないので、date 型の文字列をそのまま分解する。
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(checkedAt);
  if (!matched) return null;
  const [, year, month, day] = matched;
  return `${Number(year)}/${Number(month)}/${Number(day)} 時点`;
}

/** 「出典: メーカー公表価格 ・ 2026/8/19 時点」。どちらも無ければ null。 */
export function priceSourceText(
  source: string | null | undefined,
  checkedAt: string | null | undefined,
): string | null {
  const parts = [source ? `出典: ${source}` : null, priceCheckedAtText(checkedAt)].filter(Boolean);
  return parts.length > 0 ? parts.join(" ・ ") : null;
}

/** 「¥1,086/g」。容量が未登録なら null。1円未満の単価は小数1桁まで出す。 */
export function unitPriceText(
  priceYen: number,
  volume: number | null | undefined,
  volumeUnit: string | null | undefined,
): string | null {
  if (!volume || volume <= 0) return null;
  const unitPrice = priceYen / volume;
  const value = unitPrice >= 10 ? Math.round(unitPrice).toLocaleString() : unitPrice.toFixed(1);
  return `¥${value}/${volumeUnit ?? "単位"}`;
}
