import { deltaE, deltaELabel } from "@/lib/color";

/**
 * デザイン比較用の静的データ。supabase/seed.sql から実際の3組を写している。
 * ΔE は本番と同じ src/lib/color.ts の CIEDE2000 で計算する（数字を作文しないため）。
 */
type Item = {
  brand: string;
  name: string;
  shade: string;
  priceYen: number;
  hex: string;
  ingredients: string[];
};

const LUMINA_LIP: Item = {
  brand: "LUMINA",
  name: "グロウリップスティック",
  shade: "03 テラコッタ",
  priceYen: 3800,
  hex: "#B8604A",
  ingredients: [
    "HYDROGENATED POLYISOBUTENE",
    "DIISOSTEARYL MALATE",
    "POLYETHYLENE",
    "MICROCRYSTALLINE WAX",
    "CANDELILLA WAX",
    "OCTYLDODECANOL",
    "PHYTOSTERYL/OCTYLDODECYL LAUROYL GLUTAMATE",
    "JOJOBA ESTERS",
    "SQUALANE",
    "TOCOPHEROL",
    "CI 45410",
    "CI 15850",
    "CI 42090",
    "CI 19140",
  ],
};

const PRICO_LIP: Item = {
  brand: "PRICO",
  name: "メルティリップ",
  shade: "03 テラコッタ",
  priceYen: 980,
  hex: "#BB6249",
  ingredients: [
    "HYDROGENATED POLYISOBUTENE",
    "DIISOSTEARYL MALATE",
    "POLYETHYLENE",
    "MICROCRYSTALLINE WAX",
    "CANDELILLA WAX",
    "OCTYLDODECANOL",
    "PHYTOSTERYL/OCTYLDODECYL LAUROYL GLUTAMATE",
    "JOJOBA ESTERS",
    "TOCOPHEROL",
    "SQUALANE",
    "CI 45410",
    "CI 77891",
    "CI 42090",
    "CI 77491",
  ],
};

const SERAFI_TINT: Item = {
  brand: "SERAFI",
  name: "ヴェルベットティント",
  shade: "05 レッドブリック",
  priceYen: 3200,
  hex: "#9E3B33",
  ingredients: [
    "ISODODECANE",
    "TRIMETHYLSILOXYSILICATE",
    "DIMETHICONE",
    "SILICA",
    "POLYGLYCERYL-2 TRIISOSTEARATE",
    "CAPRYLIC/CAPRIC TRIGLYCERIDE",
    "SYNTHETIC FLUORPHLOGOPITE",
    "CERA ALBA",
    "TOCOPHERYL ACETATE",
    "CI 15850",
    "CI 42090",
    "MICA",
    "CI 19140",
  ],
};

const DAILY_TINT: Item = {
  brand: "DAILY+",
  name: "デイリーティント",
  shade: "05 レッドブリック",
  priceYen: 1100,
  hex: "#993B2D",
  ingredients: [
    "ISODODECANE",
    "TRIMETHYLSILOXYSILICATE",
    "DIMETHICONE",
    "SILICA",
    "POLYGLYCERYL-2 TRIISOSTEARATE",
    "CAPRYLIC/CAPRIC TRIGLYCERIDE",
    "CERA ALBA",
    "SYNTHETIC FLUORPHLOGOPITE",
    "TOCOPHERYL ACETATE",
    "CI 77491",
    "CI 19140",
    "MICA",
    "CI 15850",
  ],
};

const MODE_NOIR_LIP: Item = {
  brand: "mode noir",
  name: "マットリップ",
  shade: "07 ダークプラム",
  priceYen: 4200,
  hex: "#7A3348",
  ingredients: [
    "ISODODECANE",
    "TRIMETHYLSILOXYSILICATE",
    "DIMETHICONE",
    "SILICA",
    "POLYGLYCERYL-2 TRIISOSTEARATE",
    "CAPRYLIC/CAPRIC TRIGLYCERIDE",
    "SYNTHETIC FLUORPHLOGOPITE",
    "CERA ALBA",
    "TOCOPHERYL ACETATE",
    "CI 15850",
    "CI 45410",
    "CI 77491",
    "TITANIUM DIOXIDE",
  ],
};

const NUANCE_LIP: Item = {
  brand: "Nuance",
  name: "ニュアンスリップ",
  shade: "04 モーヴピンク",
  priceYen: 1580,
  hex: "#B96C81",
  ingredients: [
    "HYDROGENATED POLYISOBUTENE",
    "DIISOSTEARYL MALATE",
    "POLYETHYLENE",
    "MICROCRYSTALLINE WAX",
    "CANDELILLA WAX",
    "OCTYLDODECANOL",
    "PHYTOSTERYL/OCTYLDODECYL LAUROYL GLUTAMATE",
    "JOJOBA ESTERS",
    "SQUALANE",
    "TOCOPHEROL",
    "CI 42090",
    "MICA",
    "CI 19140",
    "TITANIUM DIOXIDE",
  ],
};

export type Comparison = {
  owned: Item;
  candidate: Item;
  /** CIEDE2000。owned と candidate の色差。 */
  dE: number;
  dELabel: string;
  /** 両方の全成分表に出てくる成分の数。 */
  sharedIngredients: number;
  ingredientCount: number;
  /** candidate に乗り換えると浮く金額。負なら candidate のほうが高い。 */
  diffYen: number;
};

function compare(owned: Item, candidate: Item): Comparison {
  const shared = owned.ingredients.filter((i) => candidate.ingredients.includes(i)).length;
  const dE = deltaE(owned.hex, candidate.hex);
  return {
    owned,
    candidate,
    dE,
    dELabel: deltaELabel(dE),
    sharedIngredients: shared,
    ingredientCount: Math.max(owned.ingredients.length, candidate.ingredients.length),
    diffYen: owned.priceYen - candidate.priceYen,
  };
}

/** 手持ち（高い方）→ 同じ色・似た処方で安い候補。 */
export const COMPARISONS: Comparison[] = [
  compare(LUMINA_LIP, PRICO_LIP),
  compare(SERAFI_TINT, DAILY_TINT),
  compare(MODE_NOIR_LIP, NUANCE_LIP),
];

export const LEAD = COMPARISONS[0];

/** 3組すべてを安い方に置き換えたときの差額合計。 */
export const TOTAL_SAVED = COMPARISONS.reduce((sum, c) => sum + Math.max(c.diffYen, 0), 0);

export const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
export const dE1 = (n: number) => n.toFixed(1);
