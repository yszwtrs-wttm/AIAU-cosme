import { describe, expect, it } from "vitest";

import { closenessScore, judgeFit } from "@/lib/fit";
import type { Category, Product, Profile, SkinType } from "@/lib/types";

function product(over: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "テストリップ",
    category: "lip" as Category,
    is_mens: false,
    price_yen: 1500,
    volume: null,
    volume_unit: null,
    jan: null,
    image_url: null,
    color_hex: "#b8604a",
    ingredients: [],
    brands: { name: "テストブランド" },
    ...over,
  };
}

function profile(over: Partial<Profile> = {}): Profile {
  return {
    user_id: "u1",
    handle: "tester",
    display_name: "テスター",
    avatar_hue: 0,
    avatar_url: null,
    bio: null,
    skin_tone_hex: null,
    skin_type: null,
    personal_color: null,
    stash_public: true,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("judgeFit", () => {
  it("プロフィールが空なら判定せず、入力を促す", () => {
    const fit = judgeFit(product(), null);
    expect(fit.verdict).toBe("unknown");
    expect(fit.shade).toBeNull();
    expect(fit.reasons).toHaveLength(1);
    expect(fit.reasons[0].tone).toBe("info");

    expect(judgeFit(product(), profile()).verdict).toBe("unknown");
  });

  it("ゆらぎやすい肌 × 香料上位・角質ケア成分は caution", () => {
    const fit = judgeFit(
      product({ ingredients: ["Water", "Fragrance", "Salicylic Acid"] }),
      profile({ skin_type: "sensitive" }),
    );
    expect(fit.verdict).toBe("caution");
    expect(fit.headline).toContain("ゆらぎやすい肌");
    expect(fit.reasons.filter((r) => r.tone === "minus").length).toBeGreaterThan(
      fit.reasons.filter((r) => r.tone === "plus").length,
    );
  });

  it("ゆらぎやすい肌 × 香料なし・保湿成分上位は good", () => {
    const fit = judgeFit(
      product({ ingredients: ["Water", "Glycerin", "Panthenol"] }),
      profile({ skin_type: "sensitive" }),
    );
    expect(fit.verdict).toBe("good");
    expect(fit.reasons.map((r) => r.text)).toContain("香料は入っていません");
  });

  it("成分表が空でも、肌の状態だけなら結論を出さない", () => {
    const fit = judgeFit(product({ ingredients: [] }), profile({ skin_type: "normal" }));
    expect(fit.verdict).toBe("unknown");
    expect(fit.reasons[0].text).toContain("注意したい点は見つかりませんでした");
  });

  it("成分の大文字小文字は判定に影響しない", () => {
    const lower = judgeFit(product({ ingredients: ["water", "fragrance"] }), profile({ skin_type: "sensitive" }));
    const upper = judgeFit(product({ ingredients: ["WATER", "FRAGRANCE"] }), profile({ skin_type: "sensitive" }));
    expect(lower).toEqual(upper);
  });

  it("肌の色にいちばん近い色番号を選ぶ（pos 順ではない）", () => {
    const fit = judgeFit(
      product({
        product_colors: [
          { pos: 1, shade_name: "01 ライト", hex: "#f5d8c0" },
          { pos: 2, shade_name: "02 ナチュラル", hex: "#e3b892" },
          { pos: 3, shade_name: "03 ディープ", hex: "#8a5a3c" },
        ],
      }),
      profile({ skin_tone_hex: "#e5ba94" }),
    );
    expect(fit.shade?.shade_name).toBe("02 ナチュラル");
    expect(fit.reasons.at(-1)?.tone).toBe("info"); // リップは近い/遠いを断定しない
  });

  it("ファンデは肌の色との差で plus / minus が変わる", () => {
    const shades = [
      { pos: 1, shade_name: "01 ライト", hex: "#f5d8c0" },
      { pos: 2, shade_name: "02 ナチュラル", hex: "#e3b892" },
    ];
    const near = judgeFit(
      product({ category: "foundation", product_colors: shades }),
      profile({ skin_tone_hex: "#e5ba94" }),
    );
    expect(near.shade?.shade_name).toBe("02 ナチュラル");
    expect(near.reasons.at(-1)?.tone).toBe("plus");

    const far = judgeFit(
      product({ category: "foundation", product_colors: shades }),
      profile({ skin_tone_hex: "#6b4430" }),
    );
    expect(far.reasons.at(-1)?.tone).toBe("minus");
    expect(far.verdict).toBe("caution");
  });
});

describe("closenessScore", () => {
  const viewer = { skinType: "dry" as SkinType, skinToneHex: "#e3b892" };

  it("投稿者情報が無ければ 0", () => {
    expect(closenessScore(viewer, null)).toBe(0);
    expect(closenessScore(viewer, undefined)).toBe(0);
    expect(closenessScore(viewer, {})).toBe(0);
  });

  it("肌の状態が同じで色も近いといちばん高い", () => {
    expect(closenessScore(viewer, { skin_type: "dry", skin_tone_hex: "#e3b892" })).toBe(4);
  });

  it("肌の色の近さで 2 / 1 / 0 に段階が付く", () => {
    const only = (hex: string) => closenessScore({ skinType: null, skinToneHex: "#e3b892" }, { skin_tone_hex: hex });
    expect(only("#e5ba94")).toBe(2); // ΔE < 5
    expect(only("#c89a78")).toBe(1); // ΔE < 10
    expect(only("#2b5ea8")).toBe(0);
  });

  it("肌の状態だけ一致なら 2", () => {
    expect(closenessScore(viewer, { skin_type: "dry" })).toBe(2);
    expect(closenessScore(viewer, { skin_type: "oily" })).toBe(0);
  });

  it("見る側の情報が無ければ加点しない", () => {
    expect(
      closenessScore({ skinType: null, skinToneHex: null }, { skin_type: "dry", skin_tone_hex: "#e3b892" }),
    ).toBe(0);
  });
});
