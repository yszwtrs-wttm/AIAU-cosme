/**
 * 容量あたり価格（単価）の表示。
 *
 * 単価は DB の生成列 `unit_price_yen` を使う。容量が未登録の商品は単価を持たないので、
 * 並び替えでは常に最後に回し、画面では「容量未登録」として単価を出さない。
 */

/** 単価の丸め方。1円未満は小数1桁まで出す（¥2.2/mL のような値をつぶさない）。 */
export function formatUnitPrice(unitPrice: number, unit: string | null): string {
  const value = unitPrice >= 10 ? Math.round(unitPrice).toLocaleString() : unitPrice.toFixed(1);
  return `¥${value}/${unit ?? "単位"}`;
}

/** 単価の表示文字列。単価が出せない（容量未登録）なら null。 */
export function unitPriceLabel(product: {
  unit_price_yen?: number | null;
  volume_unit: string | null;
}): string | null {
  if (product.unit_price_yen == null) return null;
  return formatUnitPrice(product.unit_price_yen, product.volume_unit);
}

/** 単価の安い順。単価を持たない商品は後ろにまとめる。 */
export function compareUnitPrice(
  a: { unit_price_yen?: number | null; id: number },
  b: { unit_price_yen?: number | null; id: number },
): number {
  const left = a.unit_price_yen;
  const right = b.unit_price_yen;
  if (left == null && right == null) return b.id - a.id;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right || b.id - a.id;
}
