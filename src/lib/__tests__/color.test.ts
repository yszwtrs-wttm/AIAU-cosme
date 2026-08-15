import { describe, expect, it } from "vitest";

import {
  deltaE,
  deltaELab,
  deltaELabel,
  dominantColorFromImageData,
  extractPalette,
  hexToLab,
  labArray,
  rgbToHex,
} from "@/lib/color";
import { CIEDE2000_TEST_DATA } from "./fixtures/ciede2000";

/** RGBA の並びを作るヘルパー。1 ピクセル = 4 要素。 */
function pixels(list: [number, number, number, number][]): Uint8ClampedArray {
  return new Uint8ClampedArray(list.flat());
}

function repeat(pixel: [number, number, number, number], n: number): [number, number, number, number][] {
  return Array.from({ length: n }, () => pixel);
}

/**
 * sRGB(HEX) -> CIELAB(D65) の独立実装。
 * Postgres 側の hex_to_lab と同じ式なので、JS 側が DB と同じ LAB を出しているかの照合に使う。
 */
function hexToLabReference(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const channel = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };
  const r = channel(0);
  const g = channel(2);
  const b = channel(4);

  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;

  const f = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

describe("deltaELab", () => {
  it("CIEDE2000 の公開テストデータ（Sharma et al. 2005）と一致する", () => {
    for (const [l1, a1, b1, l2, a2, b2, expected] of CIEDE2000_TEST_DATA) {
      const got = deltaELab({ l: l1, a: a1, b: b1 }, { l: l2, a: a2, b: b2 });
      // 公表値は小数 4 桁に丸められているため、その丸め幅だけ許容する。
      expect(got, `pair ${l1},${a1},${b1} / ${l2},${a2},${b2}`).toBeCloseTo(expected, 3);
    }
  });

  it("同じ色なら 0、対称である", () => {
    const a = { l: 50, a: 20, b: 10 };
    const b = { l: 55, a: 12, b: 4 };
    expect(deltaELab(a, a)).toBe(0);
    expect(deltaELab(a, b)).toBeCloseTo(deltaELab(b, a), 10);
  });
});

describe("hexToLab / labArray", () => {
  it("Postgres の hex_to_lab（D65）と同じ LAB を返す", () => {
    // labArray の値は RPC の p_lab として DB の color_lab と直接比較されるため、
    // 白色点がずれていると色検索の順位が壊れる。
    for (const hex of ["#000000", "#ffffff", "#808080", "#b8604a", "#7a3b4e", "#f0d0b0", "#2b5ea8"]) {
      const [l, a, b] = labArray(hex);
      const [rl, ra, rb] = hexToLabReference(hex);
      expect(l, hex).toBeCloseTo(rl, 1);
      expect(a, hex).toBeCloseTo(ra, 1);
      expect(b, hex).toBeCloseTo(rb, 1);
    }
  });

  it("白は L=100・無彩色、黒は L=0", () => {
    const white = hexToLab("#ffffff");
    expect(white.l).toBeCloseTo(100, 4);
    expect(white.a).toBeCloseTo(0, 4);
    expect(white.b).toBeCloseTo(0, 4);
    expect(hexToLab("#000000").l).toBeCloseTo(0, 4);
  });

  it("不正な HEX は例外", () => {
    expect(() => hexToLab("not-a-color")).toThrow();
  });
});

describe("deltaE", () => {
  it("HEX 同士でも LAB 経由と同じ値になる", () => {
    const dE = deltaE("#b8604a", "#c06050");
    expect(dE).toBeCloseTo(deltaELab(hexToLab("#b8604a"), hexToLab("#c06050")), 6);
  });

  it("近い色は小さく、離れた色は大きい", () => {
    expect(deltaE("#b8604a", "#b8604a")).toBe(0);
    expect(deltaE("#b8604a", "#ba624c")).toBeLessThan(2);
    expect(deltaE("#b8604a", "#2b5ea8")).toBeGreaterThan(10);
  });
});

describe("deltaELabel", () => {
  it("ΔE の区切りごとに言葉が変わる", () => {
    expect(deltaELabel(0.5)).toBe("肉眼では区別できない");
    expect(deltaELabel(1)).toBe("並べてもほぼ分からない");
    expect(deltaELabel(2)).toBe("似ている（単体では見分けにくい）");
    expect(deltaELabel(4.99)).toBe("似ている（単体では見分けにくい）");
    expect(deltaELabel(5)).toBe("違いが分かる");
    expect(deltaELabel(10)).toBe("別の色");
  });
});

describe("rgbToHex", () => {
  it("0-255 の RGB を HEX にする", () => {
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
    expect(rgbToHex(184, 96, 74)).toBe("#b8604a");
  });
});

describe("extractPalette", () => {
  it("白背景・黒つぶれ・無彩色を捨てて、彩度のある色だけ拾う", () => {
    const data = pixels([
      ...repeat([255, 255, 255, 255], 50), // 白背景
      ...repeat([5, 5, 5, 255], 20), // 黒つぶれ
      ...repeat([130, 128, 129, 255], 20), // 無彩色
      ...repeat([184, 96, 74, 255], 30), // 拾いたい色
    ]);
    const palette = extractPalette(data);
    expect(palette).toHaveLength(1);
    expect(deltaE(palette[0].hex, "#b8604a")).toBeLessThan(2);
    expect(palette[0].share).toBeCloseTo(1, 6);
  });

  it("透明ピクセルは無視する", () => {
    const data = pixels([...repeat([184, 96, 74, 10], 40)]);
    expect(extractPalette(data)).toEqual([]);
  });

  it("離れた色は分けて、頻度の多い順に返す", () => {
    const data = pixels([
      ...repeat([40, 94, 168, 255], 30), // 青
      ...repeat([184, 96, 74, 255], 60), // 赤茶（多い）
    ]);
    const palette = extractPalette(data);
    expect(palette).toHaveLength(2);
    expect(deltaE(palette[0].hex, "#b8604a")).toBeLessThan(3);
    expect(palette[0].share).toBeCloseTo(2 / 3, 2);
    expect(deltaE(palette[1].hex, "#285ea8")).toBeLessThan(3);
  });

  it("ΔE が minDelta 未満の色は 1 つにまとめる", () => {
    // 量子化のバケット（上位 4bit）は別だが、ΔE では 1 未満しか離れていない 2 色。
    const data = pixels([
      ...repeat([191, 96, 74, 255], 40),
      ...repeat([192, 98, 76, 255], 40),
    ]);
    expect(extractPalette(data)).toHaveLength(1);
    expect(extractPalette(data, 6, 0.1)).toHaveLength(2);
  });

  it("maxColors を超える色は返さない", () => {
    const data = pixels([
      ...repeat([200, 30, 30, 255], 20),
      ...repeat([30, 200, 30, 255], 20),
      ...repeat([30, 30, 200, 255], 20),
      ...repeat([200, 200, 30, 255], 20),
    ]);
    expect(extractPalette(data, 2)).toHaveLength(2);
  });

  it("2% 未満しか占めない色は捨てる", () => {
    const data = pixels([
      ...repeat([184, 96, 74, 255], 200),
      ...repeat([40, 94, 168, 255], 2),
    ]);
    const palette = extractPalette(data);
    expect(palette).toHaveLength(1);
    expect(deltaE(palette[0].hex, "#b8604a")).toBeLessThan(3);
  });
});

describe("dominantColorFromImageData", () => {
  it("最頻の色塊を返す", () => {
    const data = pixels([
      ...repeat([40, 94, 168, 255], 10),
      ...repeat([184, 96, 74, 255], 30),
    ]);
    expect(deltaE(dominantColorFromImageData(data), "#b8604a")).toBeLessThan(3);
  });

  it("拾える色が無ければグレーを返す", () => {
    expect(dominantColorFromImageData(pixels(repeat([255, 255, 255, 255], 10)))).toBe("#808080");
  });
});
