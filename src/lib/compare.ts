/**
 * 「安い方でいいのか、高い方に良さがあるのか」を言葉にする層。
 *
 * 似ていて安い商品を出すだけだと、高い商品の良さが不当に消える。
 * 使い心地の軸ごとの差と、成分の違いを文章にして両方の言い分を並べる。
 */

import type { FeelAxis, FeelValues } from "./feel";
import { resolveIngredients, ROLE_LABEL, type Role } from "./ingredients";

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

const NOTABLE_ROLES: Role[] = ["active", "moisture", "uv"];

/**
 * 一方にだけ入っている、意味のある成分を拾う。
 * 品質保持や色材の違いは判断材料にならないので出さない。
 */
export function ingredientEdge(
  mine: string[],
  theirs: string[],
): { role: Role; names: string[] }[] {
  const theirSet = new Set(theirs.map((x) => x.toUpperCase()));
  const only = resolveIngredients(mine)
    .filter((x) => x.known && NOTABLE_ROLES.includes(x.role))
    .filter((x) => !theirSet.has(x.inci.toUpperCase()));

  return NOTABLE_ROLES.map((role) => ({
    role,
    names: only.filter((x) => x.role === role).slice(0, 3).map((x) => x.ja),
  })).filter((g) => g.names.length > 0);
}

export function ingredientEdgeText(edge: { role: Role; names: string[] }[]): string[] {
  return edge.map((g) => `${g.names.join("・")}（${ROLE_LABEL[g.role]}）が入っています`);
}
