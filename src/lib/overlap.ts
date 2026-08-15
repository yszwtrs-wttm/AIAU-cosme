/**
 * 「なぜ似ているのか」を成分表から説明する層。
 *
 * 被り判定は pgvector の cosine 類似度で出しているが、数値も「中身ほぼ同じ」という
 * 言葉も根拠にはならない。cosine の分子（配合順の重み × IDF の積）を成分ごとに分解して、
 * どの成分が似ていると言わせているのかと、何が違うのかを日本語で並べる。
 */

import { ROLE_SHORT_LABEL, type ResolvedIngredient, type Role, resolveIngredient } from "./ingredients";

/** ingredients_master の idf。キーは大文字の INCI。 */
export type IdfMap = Record<string, number>;

export type SharedIngredient = ResolvedIngredient & {
  /** 相手の全成分表示での順番 */
  otherPos: number;
  /** 類似スコアへの寄与（共通成分の合計を 1 とした割合） */
  share: number;
};

export type IngredientOverlap = {
  /** 寄与の大きい順の共通成分 */
  shared: SharedIngredient[];
  /** 片方にしかない成分（この商品側 / 相手側） */
  onlyBase: ResolvedIngredient[];
  onlyOther: ResolvedIngredient[];
  /** 共通成分の数と、2商品に出てくる成分の総数 */
  sharedCount: number;
  unionCount: number;
  /** 上位いくつで似ている理由の大半を説明できるか（share の累積が 0.6 を超えるまでの数） */
  coreCount: number;
  /** 「違いは香料と着色料だけです」のような一行 */
  differenceText: string;
};

/** 配合順の重み × IDF。build_ingredient_vec と同じ式にする。 */
function weightAt(pos: number, inci: string, idf: IdfMap | undefined): number {
  const order = 1 / Math.log2(pos + 1);
  return order * (idf?.[inci] ?? 1);
}

const norm = (inci: string) => inci.trim().toUpperCase();

export function explainOverlap(
  baseIngredients: string[],
  otherIngredients: string[],
  idf?: IdfMap,
): IngredientOverlap {
  const otherPos = new Map<string, number>();
  otherIngredients.forEach((inci, i) => {
    const key = norm(inci);
    if (!otherPos.has(key)) otherPos.set(key, i + 1);
  });

  const shared: SharedIngredient[] = [];
  const onlyBase: ResolvedIngredient[] = [];

  baseIngredients.forEach((inci, i) => {
    const key = norm(inci);
    const pos = i + 1;
    const resolved = resolveIngredient(key, pos);
    const posInOther = otherPos.get(key);
    if (posInOther === undefined) {
      onlyBase.push(resolved);
      return;
    }
    // cosine の分子と同じ「重みの積」を寄与とする
    const contribution = weightAt(pos, key, idf) * weightAt(posInOther, key, idf);
    shared.push({ ...resolved, otherPos: posInOther, share: contribution });
  });

  const baseKeys = new Set(baseIngredients.map(norm));
  const onlyOther = otherIngredients
    .map((inci, i) => resolveIngredient(norm(inci), i + 1))
    .filter((item) => !baseKeys.has(item.inci));

  const total = shared.reduce((sum, item) => sum + item.share, 0);
  const scaled = shared
    .map((item) => ({ ...item, share: total > 0 ? item.share / total : 0 }))
    .sort((a, b) => b.share - a.share);

  let cumulative = 0;
  let coreCount = 0;
  for (const item of scaled) {
    cumulative += item.share;
    coreCount += 1;
    if (cumulative >= 0.6) break;
  }

  return {
    shared: scaled,
    onlyBase,
    onlyOther,
    sharedCount: scaled.length,
    unionCount: baseKeys.size + onlyOther.length,
    coreCount,
    differenceText: differenceText(onlyBase, onlyOther),
  };
}

/** 差分を役割でまとめて一行にする。数え上げだけなのでルールベース。 */
function differenceText(onlyBase: ResolvedIngredient[], onlyOther: ResolvedIngredient[]): string {
  const diff = [...onlyBase, ...onlyOther];
  if (diff.length === 0) return "全成分表示は同じです";

  const counts = new Map<Role, number>();
  for (const item of diff) counts.set(item.role, (counts.get(item.role) ?? 0) + 1);

  const roles = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const labels = roles.slice(0, 2).map(([role]) => ROLE_SHORT_LABEL[role]);
  const covered = roles.slice(0, 2).reduce((sum, [, n]) => sum + n, 0);

  if (covered === diff.length) return `違いは${labels.join("と")}の成分だけです`;
  return `違いは${labels.join("と")}を中心に${diff.length}成分です`;
}

/** ingredients_master から引いた行を IdfMap にする。 */
export function toIdfMap(rows: { inci: string; idf: number | null }[]): IdfMap {
  const map: IdfMap = {};
  for (const row of rows) map[norm(row.inci)] = row.idf ?? 1;
  return map;
}
