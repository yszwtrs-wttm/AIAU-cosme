import { describe, expect, it } from "vitest";

import { axesFor, biggestFeelGap, estimateFeel, type FeelAxis } from "@/lib/feel";

const MAKEUP_KEYS = ["gloss", "coverage", "lasting", "moist", "spread"];
const HAIR_KEYS = ["foam", "smooth", "moist", "scent", "lasting"];

describe("axesFor", () => {
  it("ヘア系はヘアの軸、それ以外はメイクの軸", () => {
    expect(axesFor("shampoo").map((a) => a.key)).toEqual(HAIR_KEYS);
    expect(axesFor("treatment").map((a) => a.key)).toEqual(HAIR_KEYS);
    expect(axesFor("lip").map((a) => a.key)).toEqual(MAKEUP_KEYS);
    expect(axesFor("foundation").map((a) => a.key)).toEqual(MAKEUP_KEYS);
  });
});

describe("estimateFeel", () => {
  it("カテゴリごとの軸をすべて 5〜95 の整数で埋める", () => {
    for (const [category, keys] of [
      ["lip", MAKEUP_KEYS],
      ["shampoo", HAIR_KEYS],
    ] as const) {
      const feel = estimateFeel(category, ["Water", "Glycerin"]);
      expect(Object.keys(feel).sort()).toEqual([...keys].sort());
      for (const v of Object.values(feel)) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(95);
      }
    }
  });

  it("成分の大文字小文字は結果に影響しない", () => {
    expect(estimateFeel("lip", ["diisostearyl malate", "mica"])).toEqual(
      estimateFeel("lip", ["DIISOSTEARYL MALATE", "MICA"]),
    );
  });

  it("ツヤ油が上位ならツヤ寄り、粉・マット皮膜ならマット寄り", () => {
    const glossy = estimateFeel("lip", ["DIISOSTEARYL MALATE", "MICA"]);
    const matte = estimateFeel("lip", ["ISODODECANE", "TRIMETHYLSILOXYSILICATE", "SILICA"]);
    expect(glossy.gloss).toBeGreaterThan(matte.gloss);
    expect(matte.lasting).toBeGreaterThan(glossy.lasting);
  });

  it("配合順が下がるほど効きが弱くなる", () => {
    const top = estimateFeel("lip", ["MICA", "DIISOSTEARYL MALATE"]);
    const bottom = estimateFeel("lip", ["MICA", "WATER", "WATER", "WATER", "WATER", "DIISOSTEARYL MALATE"]);
    expect(top.gloss).toBeGreaterThan(bottom.gloss);
  });

  it("色材が多いほどカバー力が高い", () => {
    const covering = estimateFeel("foundation", ["TITANIUM DIOXIDE", "IRON OXIDES"]);
    const sheer = estimateFeel("foundation", ["WATER", "GLYCERIN"]);
    expect(covering.coverage).toBeGreaterThan(sheer.coverage);
  });

  it("シャンプーは洗浄剤の種類で泡立ち・きしみが変わる", () => {
    const strong = estimateFeel("shampoo", ["WATER", "SODIUM LAURETH SULFATE"]);
    const mild = estimateFeel("shampoo", ["WATER", "COCAMIDOPROPYL BETAINE"]);
    expect(strong.foam).toBeGreaterThan(mild.foam);
    expect(mild.smooth).toBeGreaterThan(strong.smooth);
  });

  it("香り成分が無ければ香りの強さは最小値付近", () => {
    expect(estimateFeel("shampoo", ["WATER"]).scent).toBe(20);
    expect(estimateFeel("shampoo", ["FRAGRANCE"]).scent).toBeGreaterThan(60);
  });

  it("成分表が空でも落ちない", () => {
    expect(estimateFeel("lip", []).gloss).toBe(40);
  });
});

describe("biggestFeelGap", () => {
  const axes: FeelAxis[] = axesFor("lip");

  it("差がいちばん大きい軸を、向きに応じた言葉で返す", () => {
    const gap = biggestFeelGap(
      axes,
      { gloss: 30, coverage: 50, lasting: 50, moist: 50, spread: 50 },
      { gloss: 80, coverage: 55, lasting: 50, moist: 50, spread: 50 },
    );
    expect(gap?.axis.key).toBe("gloss");
    expect(gap?.text).toBe("こちらのほうがツヤ寄りです");
  });

  it("相手のほうが低ければ low 側の言葉になる", () => {
    const gap = biggestFeelGap(
      axes,
      { gloss: 80, coverage: 50, lasting: 50, moist: 50, spread: 50 },
      { gloss: 20, coverage: 50, lasting: 50, moist: 50, spread: 50 },
    );
    expect(gap?.text).toBe("こちらのほうがマット寄りです");
  });

  it("差が 12 未満なら何も言わない", () => {
    expect(
      biggestFeelGap(
        axes,
        { gloss: 50, coverage: 50, lasting: 50, moist: 50, spread: 50 },
        { gloss: 61, coverage: 45, lasting: 50, moist: 50, spread: 50 },
      ),
    ).toBeNull();
  });

  it("欠けている軸は比較対象にしない", () => {
    const gap = biggestFeelGap(axes, { gloss: 50, moist: 20 }, { coverage: 95, moist: 80 });
    expect(gap?.axis.key).toBe("moist");
  });

  it("比較できる軸が無ければ null", () => {
    expect(biggestFeelGap(axes, {}, {})).toBeNull();
  });
});
