/**
 * 「この商品は自分に合っているか」の判定。
 *
 * 材料はプロフィール（肌の状態・肌の色）と成分表・色だけ。効能やアレルギーの言い切りはしない。
 * 判定できないときは無理に結論を出さず、足りない情報を伝える。
 */

import { deltaE } from "./color";
import { DELTA_E, SKIN_TONE } from "./thresholds";
import type { Product, ProductColor, Profile, SkinType } from "./types";

export type FitVerdict = "good" | "caution" | "unknown";

export type FitReason = {
  text: string;
  tone: "plus" | "minus" | "info";
};

export type Fit = {
  verdict: FitVerdict;
  headline: string;
  reasons: FitReason[];
  /** 肌の色にいちばん近い色番号（色のある商品のみ） */
  shade: ProductColor | null;
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

export function judgeFit(product: Product, profile: Profile | null): Fit {
  const list = product.ingredients.map((x) => x.toUpperCase());
  const shades = [...(product.product_colors ?? [])].sort((a, b) => a.pos - b.pos);

  if (!profile || (!profile.skin_type && !profile.skin_tone_hex)) {
    return {
      verdict: "unknown",
      headline: "合うかどうかは、まだ判定できません",
      reasons: [
        {
          text: "肌の状態と肌の色をプロフィールに入れると、この商品が自分向きかを判定できます",
          tone: "info",
        },
      ],
      shade: null,
    };
  }

  const reasons: FitReason[] = [];

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
    if (product.category === "foundation" || product.category === "bb") {
      reasons.push(
        gap < SKIN_TONE.shade_match_delta_e
          ? { text: `肌の色に近いのは「${shade.shade_name}」です`, tone: "plus" }
          : {
              text: `いちばん近いのは「${shade.shade_name}」ですが、肌の色とは少し離れています`,
              tone: "minus",
            },
      );
    } else {
      reasons.push({ text: `肌の色となじみやすいのは「${shade.shade_name}」です`, tone: "info" });
    }
  }

  const minus = reasons.filter((r) => r.tone === "minus").length;
  const plus = reasons.filter((r) => r.tone === "plus").length;

  if (reasons.length === 0) {
    return {
      verdict: "unknown",
      headline: "気をつける点は見つかりませんでした",
      reasons: [
        { text: "成分表からは、あなたの肌に対して注意したい点は見つかりませんでした", tone: "info" },
      ],
      shade,
    };
  }

  const label = profile.skin_type ? SKIN_LABEL[profile.skin_type] : "あなた";

  if (minus > plus) {
    return {
      verdict: "caution",
      headline: `${label}には、少し注意が必要です`,
      reasons,
      shade,
    };
  }

  return {
    verdict: "good",
    headline: `${label}には合いそうです`,
    reasons,
    shade,
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
    if (d < DELTA_E.close) score += 2;
    else if (d < DELTA_E.noticeable) score += 1;
  }
  return score;
}
