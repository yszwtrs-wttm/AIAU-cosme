/**
 * ポーチ全体の色の偏りを見るための層。
 *
 * 被り検出は「1商品 vs ポーチ」の点の比較なので、全体の傾向は見えない。
 * ここでは手持ちの色を CIELAB の a*–b* 平面（色相環と同じ向き）に置いて、
 * 密集しているゾーンと 1 点も無いゾーンを出す。
 */

import { converter, formatHex } from "culori";
import { hexToLab, type Lab } from "./color";
import type { Product } from "./types";

const toRgb = converter("rgb");

/** 色物だけを見る。ファンデ・BB は肌色に寄るので偏りの話には入れない。 */
const COLOR_CATEGORIES = new Set(["lip", "eyeshadow"]);

/** 無彩色（チップやラメなど）はゾーンに入れない閾値。 */
const NEUTRAL_CHROMA = 8;

export type ColorZone = {
  id: string;
  label: string;
  /** Lab の色相角（度）の範囲。from > to のときは 0 度をまたぐ。 */
  from: number;
  to: number;
  /** 代表色を作るための明度と彩度。 */
  l: number;
  c: number;
  /** 「足りない色」として勧める優先度。大きいほど先に出す。 */
  priority: number;
};

/** メイクで語られる色の並びに合わせたゾーン。合計で 0–360 度を覆う。 */
export const COLOR_ZONES: ColorZone[] = [
  { id: "rose", label: "ローズ", from: 355, to: 20, l: 52, c: 40, priority: 5 },
  { id: "red", label: "レッド", from: 20, to: 40, l: 45, c: 52, priority: 4 },
  { id: "coral", label: "コーラル", from: 40, to: 58, l: 60, c: 45, priority: 4 },
  { id: "orange", label: "オレンジ", from: 58, to: 75, l: 62, c: 48, priority: 3 },
  { id: "beige", label: "ベージュ・ブラウン", from: 75, to: 110, l: 48, c: 28, priority: 3 },
  { id: "khaki", label: "カーキ・グリーン", from: 110, to: 200, l: 50, c: 24, priority: 1 },
  { id: "blue", label: "ブルー", from: 200, to: 290, l: 52, c: 30, priority: 1 },
  { id: "bluepink", label: "青みピンク・プラム", from: 290, to: 355, l: 50, c: 38, priority: 5 },
];

export type ColorPoint = {
  hex: string;
  lab: Lab;
  chroma: number;
  hue: number;
  productId: number;
  label: string;
  zoneId: string | null;
};

export type ZoneCount = ColorZone & { count: number; sampleHex: string };

export type StashColorMap = {
  points: ColorPoint[];
  zones: ZoneCount[];
  /** 一番密集しているゾーン。 */
  densest: ZoneCount | null;
  /** 1 点も無いゾーン（勧めたい順）。 */
  missing: ZoneCount[];
  neutralCount: number;
};

function hueOf(lab: Lab): number {
  return ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360;
}

function chromaOf(lab: Lab): number {
  return Math.sqrt(lab.a * lab.a + lab.b * lab.b);
}

function inZone(hue: number, zone: ColorZone): boolean {
  return zone.from > zone.to
    ? hue >= zone.from || hue < zone.to
    : hue >= zone.from && hue < zone.to;
}

function zoneCenter(zone: ColorZone): number {
  const span = zone.from > zone.to ? zone.to + 360 - zone.from : zone.to - zone.from;
  return (zone.from + span / 2) % 360;
}

/** ゾーンの代表色。中心の色相・決めた明度と彩度から Lab で作って HEX にする。 */
export function zoneSampleHex(zone: ColorZone): string {
  const rad = (zoneCenter(zone) * Math.PI) / 180;
  const rgb = toRgb({
    mode: "lab",
    l: zone.l,
    a: zone.c * Math.cos(rad),
    b: zone.c * Math.sin(rad),
  });
  if (!rgb) return "#808080";
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return (
    formatHex({ mode: "rgb", r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b) }) ?? "#808080"
  );
}

function pointsOf(product: Product): ColorPoint[] {
  const shades =
    product.product_colors && product.product_colors.length > 0
      ? product.product_colors.map((c) => ({ hex: c.hex, name: c.shade_name }))
      : product.color_hex
        ? [{ hex: product.color_hex, name: "" }]
        : [];

  return shades.flatMap(({ hex, name }) => {
    let lab: Lab;
    try {
      lab = hexToLab(hex);
    } catch {
      return [];
    }
    const chroma = chromaOf(lab);
    const hue = hueOf(lab);
    const zone = chroma < NEUTRAL_CHROMA ? null : COLOR_ZONES.find((z) => inZone(hue, z));
    return [
      {
        hex,
        lab,
        chroma,
        hue,
        productId: product.id,
        label: name ? `${product.name} / ${name}` : product.name,
        zoneId: zone?.id ?? null,
      },
    ];
  });
}

/** ポーチの色物（リップ・アイシャドウ）を色相ゾーンに割り振る。 */
export function buildStashColorMap(products: Product[]): StashColorMap {
  const points = products
    .filter((p) => COLOR_CATEGORIES.has(p.category))
    .flatMap(pointsOf);

  const zones: ZoneCount[] = COLOR_ZONES.map((zone) => ({
    ...zone,
    count: points.filter((p) => p.zoneId === zone.id).length,
    sampleHex: zoneSampleHex(zone),
  }));

  const filled = zones.filter((z) => z.count > 0);
  const densest =
    filled.length > 0
      ? filled.reduce((best, z) => (z.count > best.count ? z : best), filled[0])
      : null;

  const missing = zones
    .filter((z) => z.count === 0)
    .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));

  return {
    points,
    zones,
    densest,
    missing,
    neutralCount: points.filter((p) => p.zoneId === null).length,
  };
}

/** 「コーラル寄りに9点、青みピンクは0点」の1行サマリ。 */
export function colorMapSummary(map: StashColorMap): string {
  if (map.points.length === 0) {
    return "リップ・アイシャドウを登録すると、手持ちの色の偏りが見えます。";
  }
  if (!map.densest) {
    return `色みのはっきりした手持ちがまだありません（無彩色 ${map.neutralCount}点）。`;
  }

  const head = `あなたのポーチは${map.densest.label}寄りに${map.densest.count}点`;
  const top = map.missing[0];
  if (!top) return `${head}。空いている色相はありません。`;
  return `${head}、${top.label}は0点です。`;
}
