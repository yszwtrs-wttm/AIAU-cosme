/**
 * 「この商品は自分に合っているか」の判定。
 *
 * 材料はプロフィール（肌の状態・肌の色）と成分表・色だけ。効能やアレルギーの言い切りはしない。
 * 判定できないときは無理に結論を出さず、足りない情報を伝える。
 */

import { deltaE } from "./color";
import { estimateFeel } from "./feel";
import { SKIN_TYPE_LABEL, type Product, type ProductColor, type Profile, type SkinType } from "./types";
import { colorName } from "./wording";

export type FitVerdict = "good" | "caution" | "unknown";

export type FitReason = {
  text: string;
  tone: "plus" | "minus" | "info";
};

/** 判定に使った（使えなかった）材料。未登録のものは登録導線にする。 */
export type FitMaterial = {
  key: "skin_type" | "skin_tone" | "avoid" | "ingredients";
  label: string;
  /** used: 判定に使った / missing: 未登録なので使えなかった / none: この商品には当てはまらない */
  status: "used" | "missing" | "none";
  detail: string;
  /** 色の見本を出す材料だけ */
  swatch?: string;
  /** 未登録のときの登録先 */
  href?: string;
};

/** 「どのくらい」を3段階で見せる項目。 */
export type FitLevel = {
  label: string;
  /** 3=良い 2=ふつう 1=注意 0=材料が足りない */
  level: 0 | 1 | 2 | 3;
  text: string;
};

/** 材料がいくつ揃っているかで決まる判定の確かさ。 */
export type FitConfidence = "high" | "mid" | "low";

export const FIT_CONFIDENCE_LABEL: Record<FitConfidence, string> = {
  high: "高",
  mid: "ふつう",
  low: "低",
};

/** プロフィールの「避けたい成分」。judgeFit はDBを読まないので呼び出し側が渡す。 */
export type FitAvoid = {
  /** 登録している避けたい成分の件数 */
  registered: number;
  /** そのうち、この商品に入っているものの表示名 */
  matched: string[];
};

export type Fit = {
  verdict: FitVerdict;
  headline: string;
  reasons: FitReason[];
  /** 肌の色にいちばん近い色番号（色のある商品のみ） */
  shade: ProductColor | null;
  materials: FitMaterial[];
  levels: FitLevel[];
  confidence: FitConfidence;
};

/** 配合順を考慮した「入っている度合い」。0（入っていない）〜1（先頭）。 */
function amount(list: string[], pattern: RegExp): number {
  const i = list.findIndex((x) => pattern.test(x));
  if (i < 0) return 0;
  return 1 / Math.log2(i + 2);
}

const SKIN_LABEL: Record<SkinType, string> = {
  dry: "乾燥しやすい肌",
  normal: "ふつうの肌",
  oily: "皮脂が出やすい肌",
  combination: "混合肌",
  sensitive: "ゆらぎやすい肌",
};

function materialsOf(
  product: Product,
  profile: Profile | null,
  avoid: FitAvoid,
  hasShades: boolean,
): FitMaterial[] {
  return [
    profile?.skin_type
      ? { key: "skin_type", label: "肌の状態", status: "used", detail: SKIN_TYPE_LABEL[profile.skin_type] }
      : { key: "skin_type", label: "肌の状態", status: "missing", detail: "未登録", href: "/settings" },
    !profile?.skin_tone_hex
      ? { key: "skin_tone", label: "肌の色", status: "missing", detail: "未登録", href: "/settings" }
      : hasShades
        ? {
            key: "skin_tone",
            label: "肌の色",
            status: "used",
            detail: colorName(profile.skin_tone_hex),
            swatch: profile.skin_tone_hex,
          }
        : {
            key: "skin_tone",
            label: "肌の色",
            status: "none",
            detail: "この商品に色番号なし",
            swatch: profile.skin_tone_hex,
          },
    avoid.registered > 0
      ? { key: "avoid", label: "避けたい成分", status: "used", detail: `${avoid.registered}件と照合` }
      : { key: "avoid", label: "避けたい成分", status: "missing", detail: "未登録", href: "/settings" },
    product.ingredients.length > 0
      ? {
          key: "ingredients",
          label: "成分表",
          status: "used",
          detail: `${product.ingredients.length}成分を配合順で確認`,
        }
      : { key: "ingredients", label: "成分表", status: "none", detail: "登録されていません" },
  ];
}

/**
 * 肌の色と色番号の近さを段階にする。
 * ファンデ・BB は肌の色に近いほど良いが、色もの（リップなど）は離れていても問題ないので分ける。
 */
function shadeLevel(gap: number, shadeName: string, isBase: boolean): FitLevel {
  if (!isBase) {
    return {
      label: "肌の色との相性",
      level: 3,
      text: `肌の色から選ぶなら「${shadeName}」がなじみます`,
    };
  }
  if (gap < 6) return { label: "肌の色との相性", level: 3, text: `「${shadeName}」が肌の色になじみます` };
  if (gap < 12) {
    return {
      label: "肌の色との相性",
      level: 2,
      text: `いちばん近いのは「${shadeName}」。少し差があります`,
    };
  }
  return { label: "肌の色との相性", level: 1, text: `「${shadeName}」でも肌の色とは離れています` };
}

/** 成分から推定した使用感が、その肌の状態に向いているかを段階にする。 */
function feelLevel(product: Product, skinType: SkinType): FitLevel {
  const feel = estimateFeel(product.category, product.ingredients);
  const moist = feel.moist ?? 50;
  const lasting = feel.lasting ?? 50;

  const score =
    skinType === "dry" || skinType === "sensitive"
      ? moist
      : skinType === "oily" || skinType === "combination"
        ? (lasting + (100 - moist)) / 2
        : 100 - Math.abs(moist - 50) * 2;

  const wording =
    skinType === "dry" || skinType === "sensitive"
      ? moist >= 60
        ? "しっとり寄りの処方と推定しました"
        : moist >= 40
          ? "うるおいはふつうくらいと推定しました"
          : "さらっと寄りなので、乾きを感じやすいかもしれません"
      : skinType === "oily" || skinType === "combination"
        ? score >= 60
          ? "崩れにくくさらっとした仕上がりと推定しました"
          : score >= 40
            ? "仕上がりはふつうくらいと推定しました"
            : "しっとり寄りなので、テカりやすいかもしれません"
        : moist >= 60
          ? "しっとり寄りの処方と推定しました"
          : moist >= 40
            ? "かたよりの少ない処方と推定しました"
            : "さらっと寄りの処方と推定しました";

  return {
    label: "使用感の推定",
    level: score >= 60 ? 3 : score >= 40 ? 2 : 1,
    text: `${wording}（成分の配合順からの推定）`,
  };
}

function avoidLevel(avoid: FitAvoid): FitLevel {
  if (avoid.registered === 0) {
    return {
      label: "避けたい成分",
      level: 0,
      text: "避けたい成分が未登録なので、照合できていません",
    };
  }
  if (avoid.matched.length > 0) {
    return {
      label: "避けたい成分",
      level: 1,
      text: `登録した${avoid.matched.join("・")}が入っています`,
    };
  }
  return { label: "避けたい成分", level: 3, text: "登録した避けたい成分は入っていません" };
}

function confidenceOf(materials: FitMaterial[]): FitConfidence {
  const used = materials.filter((m) => m.status === "used").length;
  if (used >= 4) return "high";
  if (used >= 2) return "mid";
  return "low";
}

function skinReasons(skinType: SkinType, list: string[]): FitReason[] {
  const out: FitReason[] = [];

  const fragrance = amount(list, /FRAGRANCE|PARFUM|MENTHOL|MENTHYL/);
  const strongCleanser = amount(list, /LAURETH SULFATE|LAURYL SULFATE/);
  const exfoliant = amount(list, /SALICYLIC ACID|GLYCOLIC ACID|LACTIC ACID/);
  const humectant = amount(list, /GLYCERIN|HYALURON|BUTYLENE GLYCOL|PANTHENOL/);
  const oil = amount(list, /OIL|BUTTER|SQUALANE|MALATE|POLYISOBUTENE/);
  const powder = amount(list, /SILICA|TALC|BORON NITRIDE|ZINC OXIDE/);
  const wax = amount(list, /WAX|CERA ALBA|POLYETHYLENE/);

  if (skinType === "sensitive") {
    if (fragrance > 0.3) out.push({ text: "香りの成分が多めに入っています", tone: "minus" });
    if (exfoliant > 0) out.push({ text: "角質を落とす成分が入っています", tone: "minus" });
    if (strongCleanser > 0.3) out.push({ text: "洗浄力が強めの成分が中心です", tone: "minus" });
    if (fragrance === 0) out.push({ text: "香料は入っていません", tone: "plus" });
    if (humectant > 0.4) out.push({ text: "うるおい成分が上位に入っています", tone: "plus" });
  }

  if (skinType === "dry") {
    if (strongCleanser > 0.3) out.push({ text: "洗浄力が強めなので、洗ったあと乾きやすいかもしれません", tone: "minus" });
    if (powder > 0.5 && humectant < 0.3) out.push({ text: "皮脂を吸う粉が多く、乾きを感じやすい処方です", tone: "minus" });
    if (humectant > 0.4 || oil > 0.4) out.push({ text: "うるおいを保つ成分が上位に入っています", tone: "plus" });
  }

  if (skinType === "oily" || skinType === "combination") {
    if (oil > 0.6 && powder < 0.2) out.push({ text: "油分が多めなので、テカりやすいかもしれません", tone: "minus" });
    if (powder > 0.3) out.push({ text: "皮脂を吸ってサラサラに保つ成分が入っています", tone: "plus" });
    if (wax > 0.3) out.push({ text: "崩れにくいワックスが入っています", tone: "plus" });
  }

  if (skinType === "normal") {
    if (humectant > 0.4) out.push({ text: "うるおい成分が上位に入っています", tone: "plus" });
    if (fragrance > 0.5) out.push({ text: "香りは強めです", tone: "info" });
  }

  return out;
}

export function judgeFit(product: Product, profile: Profile | null, avoid?: FitAvoid): Fit {
  const list = product.ingredients.map((x) => x.toUpperCase());
  const shades = [...(product.product_colors ?? [])].sort((a, b) => a.pos - b.pos);
  const avoidInput: FitAvoid = avoid ?? { registered: 0, matched: [] };
  const materials = materialsOf(product, profile, avoidInput, shades.length > 0);
  const confidence = confidenceOf(materials);

  if (!profile || (!profile.skin_type && !profile.skin_tone_hex)) {
    return {
      verdict: "unknown",
      headline: "材料が足りないので、判定は出していません",
      reasons: [
        {
          text: "肌の状態と肌の色をプロフィールに入れると、この商品が自分向きかを判定できます",
          tone: "info",
        },
      ],
      shade: null,
      materials,
      levels: [avoidLevel(avoidInput)],
      confidence,
    };
  }

  const reasons: FitReason[] = [];
  const levels: FitLevel[] = [];

  if (profile.skin_type) {
    reasons.push(...skinReasons(profile.skin_type, list));
  }

  let shade: ProductColor | null = null;
  if (profile.skin_tone_hex && shades.length > 0) {
    const sorted = [...shades].sort(
      (a, b) => deltaE(profile.skin_tone_hex!, a.hex) - deltaE(profile.skin_tone_hex!, b.hex),
    );
    shade = sorted[0];
    const gap = deltaE(profile.skin_tone_hex, shade.hex);
    const isBase = product.category === "foundation" || product.category === "bb";
    levels.push(shadeLevel(gap, shade.shade_name, isBase));
    if (isBase) {
      reasons.push(
        gap < 6
          ? { text: `肌の色に近いのは「${shade.shade_name}」です`, tone: "plus" }
          : {
              text: `いちばん近いのは「${shade.shade_name}」ですが、肌の色とは少し離れています`,
              tone: "minus",
            },
      );
    } else {
      reasons.push({ text: `肌の色となじみやすいのは「${shade.shade_name}」です`, tone: "info" });
    }
  } else {
    levels.push({
      label: "肌の色との相性",
      level: 0,
      text: profile.skin_tone_hex
        ? "この商品には色番号がないので、色の相性は見ていません"
        : "肌の色が未登録なので、色の相性は見ていません",
    });
  }

  levels.push(avoidLevel(avoidInput));

  if (profile.skin_type && product.ingredients.length > 0) {
    levels.push(feelLevel(product, profile.skin_type));
  } else {
    levels.push({
      label: "使用感の推定",
      level: 0,
      text: profile.skin_type
        ? "成分表が登録されていないので、使用感は推定できません"
        : "肌の状態が未登録なので、使用感の向き不向きは出せません",
    });
  }

  if (avoidInput.matched.length > 0) {
    reasons.push({
      text: `避けたい成分として登録した${avoidInput.matched.join("・")}が入っています`,
      tone: "minus",
    });
  }

  const minus = reasons.filter((r) => r.tone === "minus").length;
  const plus = reasons.filter((r) => r.tone === "plus").length;

  if (product.ingredients.length === 0 && shades.length === 0) {
    return {
      verdict: "unknown",
      headline: "材料が足りないので、判定は出していません",
      reasons: [
        { text: "この商品は成分表も色番号も登録されていないため、照合できる材料がありません", tone: "info" },
      ],
      shade,
      materials,
      levels,
      confidence,
    };
  }

  if (reasons.length === 0) {
    return {
      verdict: "unknown",
      headline: "気をつける点は見つかりませんでした",
      reasons: [
        { text: "成分表からは、あなたの肌に対して注意したい点は見つかりませんでした", tone: "info" },
      ],
      shade,
      materials,
      levels,
      confidence,
    };
  }

  const label = profile.skin_type ? SKIN_LABEL[profile.skin_type] : "あなた";

  if (minus > plus) {
    return {
      verdict: "caution",
      headline: `${label}には、少し注意が必要です`,
      reasons,
      shade,
      materials,
      levels,
      confidence,
    };
  }

  return {
    verdict: "good",
    headline: `${label}には合いそうです`,
    reasons,
    shade,
    materials,
    levels,
    confidence,
  };
}

/**
 * 口コミを「自分に近い人の順」に並べる。肌の状態が同じ人・肌の色が近い人を上に出す。
 * 近さが同じなら新しい順。
 */
export function closenessScore(
  viewer: { skinType: SkinType | null; skinToneHex: string | null },
  author: { skin_type?: SkinType | null; skin_tone_hex?: string | null } | null | undefined,
): number {
  if (!author) return 0;
  let score = 0;
  if (viewer.skinType && author.skin_type === viewer.skinType) score += 2;
  if (viewer.skinToneHex && author.skin_tone_hex) {
    const d = deltaE(viewer.skinToneHex, author.skin_tone_hex);
    if (d < 5) score += 2;
    else if (d < 10) score += 1;
  }
  return score;
}
