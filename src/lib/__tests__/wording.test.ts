import { describe, expect, it } from "vitest";

import {
  colorDifferenceText,
  colorMatchBadge,
  colorMatchText,
  colorName,
  colorSearchBadge,
  dedupeShades,
  formulaMatchBadge,
  formulaMatchText,
  hueGroup,
  sortBySkinTone,
} from "@/lib/wording";

describe("colorMatchText", () => {
  it("ΔE の区切りで言葉と tone が変わる", () => {
    expect(colorMatchText(0.9)).toEqual({ title: "見分けがつきません", tone: "same" });
    expect(colorMatchText(1)).toEqual({ title: "並べても違いは分かりにくい色です", tone: "same" });
    expect(colorMatchText(2)).toEqual({ title: "かなり近い色です（塗ればほぼ同じ）", tone: "close" });
    expect(colorMatchText(5)).toEqual({ title: "少し違う色です", tone: "near" });
    expect(colorMatchText(10)).toEqual({ title: "別の色です", tone: "diff" });
  });
});

describe("colorMatchBadge / colorSearchBadge", () => {
  it("バッジは短い言葉になる", () => {
    expect(colorMatchBadge(1.9)).toBe("ほぼ同じ色");
    expect(colorMatchBadge(4.9)).toBe("かなり近い");
    expect(colorMatchBadge(9.9)).toBe("少し違う");
    expect(colorMatchBadge(10)).toBe("別の色");
  });

  it("写真検索は「別の色」と言い切らない", () => {
    expect(colorSearchBadge(15)).toBe("やや離れた色");
    expect(colorSearchBadge(20)).toBe("写真の色とは離れた色");
    expect(colorSearchBadge(50)).not.toBe("別の色");
  });
});

describe("colorDifferenceText", () => {
  it("明るさ・赤み・黄みの向きを言葉にする", () => {
    expect(colorDifferenceText("#808080", "#c8c8c8")).toContain("明るい");
    expect(colorDifferenceText("#c8c8c8", "#808080")).toContain("暗い");
    expect(colorDifferenceText("#808080", "#b04040")).toContain("赤みが強い");
    expect(colorDifferenceText("#b04040", "#808080")).toContain("赤みが弱い");
    expect(colorDifferenceText("#808080", "#8a8a30")).toContain("黄みが強い");
    expect(colorDifferenceText("#808080", "#7a7ac8")).toContain("青みが強い");
  });

  it("差の大きさで修飾語が変わる", () => {
    expect(colorDifferenceText("#808080", "#858585")).toContain("わずかに");
    expect(colorDifferenceText("#808080", "#ffffff")).toContain("かなり");
  });

  it("ほぼ同じ色みなら差を並べない", () => {
    expect(colorDifferenceText("#b8604a", "#b8604a")).toBe("ほとんど同じ色みです");
  });
});

describe("formulaMatchText / formulaMatchBadge", () => {
  it("cosine 類似度の区切りで言葉が変わる", () => {
    expect(formulaMatchText(0.99)).toBe("中身はほとんど同じ処方です");
    expect(formulaMatchText(0.9)).toBe("中身はかなり似た処方です");
    expect(formulaMatchText(0.75)).toBe("似た処方です");
    expect(formulaMatchText(0.5)).toBe("一部の成分が共通しています");
    expect(formulaMatchText(0.49)).toBe("処方は違います");
  });

  it("バッジは 4 段階", () => {
    expect(formulaMatchBadge(0.95)).toBe("中身ほぼ同じ");
    expect(formulaMatchBadge(0.85)).toBe("中身かなり似てる");
    expect(formulaMatchBadge(0.7)).toBe("中身似てる");
    expect(formulaMatchBadge(0.69)).toBe("中身は違う");
  });
});

describe("colorName", () => {
  it("彩度が低い色は明るさで無彩色名になる", () => {
    expect(colorName("#ffffff")).toBe("ホワイト");
    expect(colorName("#b4b4b4")).toBe("ライトグレー");
    expect(colorName("#787878")).toBe("グレー");
    expect(colorName("#1a1a1a")).toBe("ブラック");
  });

  it("色相に応じた呼び名が付く", () => {
    expect(colorName("#e01030")).toContain("レッド");
    expect(colorName("#20a0c0")).toBe("ブルー");
    expect(colorName("#e8a0a8")).toMatch(/ローズ|ピンク/);
  });

  it("明るさと彩度で修飾語が付き、矛盾する組み合わせは残らない", () => {
    expect(colorName("#f5d8c0")).toMatch(/^くすみライト|^ライト/);
    expect(colorName("#4a2020")).toContain("ディープ");
    for (const hex of ["#ffffff", "#e01030", "#e8a0a8", "#20a0c0", "#f5d8c0", "#4a2020", "#b8604a"]) {
      expect(colorName(hex)).not.toContain("くすみビビッド");
    }
  });
});

describe("hueGroup", () => {
  it("彩度の低い色は「その他」", () => {
    expect(hueGroup("#808080")).toBe("その他");
  });

  it("代表的な色をチップの系統に振り分ける", () => {
    expect(hueGroup("#c0392b")).toBe("レッド系");
    expect(hueGroup("#8a5a3c")).toBe("ブラウン系");
    expect(hueGroup("#7a3b6e")).toBe("プラム系");
    expect(hueGroup("#2b5ea8")).toBe("その他");
  });
});

describe("dedupeShades", () => {
  it("ほぼ同じ色は先に出てきたほうだけ残す", () => {
    const shades = [
      { hex: "#b8604a", shade_name: "01" },
      { hex: "#b9614b", shade_name: "02" },
      { hex: "#2b5ea8", shade_name: "03" },
    ];
    expect(dedupeShades(shades).map((s) => s.shade_name)).toEqual(["01", "03"]);
    expect(dedupeShades(shades, 0)).toHaveLength(3);
  });

  it("minDelta を大きくすると残る色が減る", () => {
    const shades = [{ hex: "#b8604a" }, { hex: "#c07050" }];
    expect(dedupeShades(shades)).toHaveLength(2);
    expect(dedupeShades(shades, 20)).toHaveLength(1);
  });
});

describe("sortBySkinTone", () => {
  it("肌の色に近い順に並べ、元の配列は変えない", () => {
    const shades = [{ hex: "#8a5a3c" }, { hex: "#f5d8c0" }, { hex: "#e3b892" }];
    const sorted = sortBySkinTone(shades, "#e5ba94");
    expect(sorted.map((s) => s.hex)).toEqual(["#e3b892", "#f5d8c0", "#8a5a3c"]);
    expect(shades[0].hex).toBe("#8a5a3c");
  });
});
