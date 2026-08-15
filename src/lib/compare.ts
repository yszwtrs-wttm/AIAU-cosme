/**
 * 「安い方でいいのか、高い方に良さがあるのか」を見せる層。
 *
 * 似ていて安い商品を出すだけだと、高い商品の良さが不当に消える。
 * 使い心地の軸ごとの差を並べて、両方の言い分を同じ大きさで出す。
 */

import type { FeelAxis, FeelValues } from "./feel";

export type AxisDiff = {
  axis: FeelAxis;
  /** 高い方の値 */
  high: number;
  /** 安い方の値 */
  low: number;
  /** high - low */
  diff: number;
};

export function axisDiffs(axes: FeelAxis[], high: FeelValues, low: FeelValues): AxisDiff[] {
  return axes
    .map((axis) => {
      const h = high[axis.key] ?? 50;
      const l = low[axis.key] ?? 50;
      return { axis, high: h, low: l, diff: h - l };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}
