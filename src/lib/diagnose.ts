/**
 * 手持ちから逆算する診断。
 *
 * 質問に答えさせる診断はやらない。ポーチに入っている色ものの色分布（CIELAB）と
 * ベースアイテムの成分から「傾向」を出し、提案としてユーザーに渡す。
 * 断定はしないので、結果は上書きではなく確定操作を挟んで反映する（`applyDiagnosis`）。
 */

import { deltaE, hexToLab } from "./color";
import { colorName } from "./wording";
import {
  PERSONAL_COLOR_LABEL,
  SKIN_TONE_PRESETS,
  SKIN_TYPE_LABEL,
  type PersonalColor,
  type Product,
  type SkinType,
} from "./types";

export type Confidence = "low" | "medium" | "high";

export type ColorSample = { hex: string; name: string; tone: "warm" | "cool" | "neutral" };

export type PersonalColorGuess = {
  personalColor: PersonalColor;
  /** 「イエベ寄り」「ブルベ寄り」 */
  axis: string;
  headline: string;
  reasons: string[];
  confidence: Confidence;
  samples: ColorSample[];
  counted: number;
};

export type SkinTypeGuess = {
  skinType: SkinType;
  headline: string;
  reasons: string[];
  confidence: Confidence;
  counted: number;
};

export type StashDiagnosis = {
  personalColor: PersonalColorGuess | null;
  skinType: SkinTypeGuess | null;
  /** 色ものの登録数。提案できないときに「あと何点」を出すために持つ */
  colorItemCount: number;
  baseItemCount: number;
};

/** 色ものとして色分布に使うカテゴリ。肌色に寄せて作るベースは除く。 */
const COLOR_CATEGORIES = new Set(["lip", "eyeshadow"]);
/** 肌に広く塗るもの。成分の傾向から肌の状態を推し量る材料にする。 */
const BASE_CATEGORIES = new Set(["foundation", "bb", "sunscreen"]);

const MIN_COLOR_ITEMS = 2;
const MIN_BASE_ITEMS = 2;

type WeightedColor = { hex: string; weight: number };

/** 0〜360 に正規化した LAB の色相角。 */
function hueAngle(hex: string): number {
  const { a, b } = hexToLab(hex);
  const deg = (Math.atan2(b, a) * 180) / Math.PI;
  return (deg + 360) % 360;
}

function chroma(hex: string): number {
  const { a, b } = hexToLab(hex);
  return Math.sqrt(a * a + b * b);
}

/**
 * 色相角から黄み寄り（イエベ）／青み寄り（ブルベ）を決める。
 * 黄〜オレンジ〜朱赤は黄み、青紫〜赤紫〜青みピンクは青み、その間は判定しない。
 */
function toneOf(hex: string): "warm" | "cool" | "neutral" {
  const h = hueAngle(hex);
  if (h >= 30 && h <= 120) return "warm";
  if (h <= 18 || h >= 190) return "cool";
  return "neutral";
}

/** 商品の色を集める。色番があるものは色番ごとに、無いものは代表色を1つ数える。 */
function colorsOf(product: Product): WeightedColor[] {
  const shades = (product.product_colors ?? []).filter((c) => c.hex);
  if (shades.length > 0) {
    return shades.map((c) => ({ hex: c.hex, weight: 1 / shades.length }));
  }
  return product.color_hex ? [{ hex: product.color_hex, weight: 1 }] : [];
}

function confidenceOf(counted: number, share: number): Confidence {
  if (counted >= 5 && share >= 0.65) return "high";
  if (counted >= 3 && share >= 0.55) return "medium";
  return "low";
}

function guessPersonalColor(products: Product[]): {
  guess: PersonalColorGuess | null;
  counted: number;
} {
  const items = products.filter((p) => COLOR_CATEGORIES.has(p.category));
  const colors = items.flatMap(colorsOf);
  if (colors.length === 0) return { guess: null, counted: items.length };

  let warm = 0;
  let cool = 0;
  let weight = 0;
  let lightness = 0;
  let clarity = 0;

  for (const c of colors) {
    const tone = toneOf(c.hex);
    if (tone === "warm") warm += c.weight;
    if (tone === "cool") cool += c.weight;
    weight += c.weight;
    lightness += hexToLab(c.hex).l * c.weight;
    clarity += chroma(c.hex) * c.weight;
  }

  if (items.length < MIN_COLOR_ITEMS || warm + cool === 0) {
    return { guess: null, counted: items.length };
  }

  const avgL = lightness / weight;
  const avgC = clarity / weight;
  const isWarm = warm >= cool;
  const share = (isWarm ? warm : cool) / (warm + cool);
  // 明るい・鮮やかならスプリング/ウィンター、暗い・くすんでいればオータム/サマー。
  const bright = avgL >= 52 || avgC >= 46;
  const personalColor: PersonalColor = isWarm
    ? bright
      ? "spring"
      : "autumn"
    : bright
      ? "winter"
      : "summer";

  const axis = isWarm ? "イエベ寄り" : "ブルベ寄り";
  const reasons = [
    `色ものが${items.length}点あり、そのうち${Math.round(share * 100)}%が${
      isWarm ? "黄み寄りの色" : "青み寄りの色"
    }でした`,
    bright
      ? "明るくはっきりした色を選ぶ傾向があります"
      : "深めでくすんだ色を選ぶ傾向があります",
  ];

  const samples = dedupeSamples(colors.map((c) => c.hex)).map((hex) => ({
    hex,
    name: colorName(hex),
    tone: toneOf(hex),
  }));

  return {
    guess: {
      personalColor,
      axis,
      headline: `あなたが持っている色は${axis}です`,
      reasons,
      confidence: confidenceOf(items.length, share),
      samples,
      counted: items.length,
    },
    counted: items.length,
  };
}

/** 見本として並べる色。似た色が続くと分布が伝わらないので間引く。 */
function dedupeSamples(hexes: string[], max = 6): string[] {
  const out: string[] = [];
  for (const hex of hexes) {
    if (out.length >= max) break;
    if (out.some((h) => deltaE(h, hex) < 10)) continue;
    out.push(hex);
  }
  return out;
}

/** 配合順を考慮した「入っている度合い」。0（入っていない）〜1（先頭）。 */
function amount(list: string[], pattern: RegExp): number {
  const i = list.findIndex((x) => pattern.test(x));
  if (i < 0) return 0;
  return 1 / Math.log2(i + 2);
}

function guessSkinType(products: Product[]): { guess: SkinTypeGuess | null; counted: number } {
  const items = products.filter((p) => BASE_CATEGORIES.has(p.category));
  if (items.length < MIN_BASE_ITEMS) return { guess: null, counted: items.length };

  let powder = 0;
  let oil = 0;
  let humectant = 0;
  let fragrance = 0;

  for (const product of items) {
    const list = product.ingredients.map((x) => x.toUpperCase());
    powder += amount(list, /SILICA|TALC|BORON NITRIDE|STARCH|MICA/);
    oil += amount(list, /OIL|BUTTER|SQUALANE|TRIGLYCERIDE|POLYISOBUTENE/);
    humectant += amount(list, /GLYCERIN|HYALURON|BUTYLENE GLYCOL|PANTHENOL/);
    fragrance += amount(list, /FRAGRANCE|PARFUM|MENTHOL|ALCOHOL DENAT/);
  }

  const n = items.length;
  powder /= n;
  oil /= n;
  humectant /= n;
  fragrance /= n;

  const reasons: string[] = [`ベースアイテム${n}点の成分から見ています`];
  let skinType: SkinType;

  if (powder - oil > 0.1) {
    skinType = "oily";
    reasons.push("皮脂を吸う粉が上位に入ったベースを選んでいます");
  } else if (oil - powder > 0.1 || humectant > 0.5) {
    skinType = "dry";
    reasons.push("うるおいを保つ油分・保湿成分が上位のベースを選んでいます");
  } else if (fragrance === 0) {
    skinType = "sensitive";
    reasons.push("香料やアルコールを含まないベースだけを選んでいます");
  } else {
    skinType = "normal";
    reasons.push("油分と粉のバランスが取れたベースを選んでいます");
  }

  const gap = Math.abs(powder - oil);
  const confidence: Confidence = n >= 4 && gap > 0.25 ? "medium" : "low";

  return {
    guess: {
      skinType,
      headline: `手持ちのベースは${SKIN_TYPE_LABEL[skinType]}肌向けの処方が多めです`,
      reasons,
      confidence,
      counted: n,
    },
    counted: n,
  };
}

export function diagnoseStash(products: Product[]): StashDiagnosis {
  const color = guessPersonalColor(products);
  const skin = guessSkinType(products);
  return {
    personalColor: color.guess,
    skinType: skin.guess,
    colorItemCount: color.counted,
    baseItemCount: skin.counted,
  };
}

export const MIN_COLOR_ITEMS_FOR_DIAGNOSIS = MIN_COLOR_ITEMS;
export const MIN_BASE_ITEMS_FOR_DIAGNOSIS = MIN_BASE_ITEMS;

/**
 * 自撮りから取った肌の色を、プロフィールで選べる肌トーンのどれかに寄せる。
 * 推定値そのままだと設定画面の選択肢と一致せず、あとから直せなくなる。
 */
export function nearestSkinTonePreset(hex: string): { hex: string; label: string } {
  return [...SKIN_TONE_PRESETS].sort((a, b) => deltaE(hex, a.hex) - deltaE(hex, b.hex))[0];
}

export function personalColorLabel(value: PersonalColor): string {
  return PERSONAL_COLOR_LABEL[value];
}

export function confidenceLabel(confidence: Confidence): string {
  if (confidence === "high") return "手持ちの傾向はかなりはっきりしています";
  if (confidence === "medium") return "手持ちの傾向はややはっきりしています";
  return "手持ちが少ないので、目安として見てください";
}
