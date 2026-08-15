/**
 * どの文言がどのしきい値に対応するかを固定する。
 *
 * 表示（wording / color）と判定（thresholds / SQL）が同じ数値を見ていることを、
 * 境界値と生成済みマイグレーションの両方で確かめる。
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { deltaELabel } from "./color";
import raw from "./thresholds.json";
import { DELTA_E, deltaETier, formulaSimTier, FORMULA_SIM, PALETTE_COVERAGE, SHADE } from "./thresholds";
import { colorMatchBadge, colorMatchText, colorSearchBadge, formulaMatchBadge, formulaMatchText } from "./wording";

const EPS = 1e-9;

describe("deltaETier", () => {
  it("各段階の境界がしきい値と一致する", () => {
    expect(deltaETier(0)).toBe("identical");
    expect(deltaETier(DELTA_E.identical - EPS)).toBe("identical");
    expect(deltaETier(DELTA_E.identical)).toBe("indistinguishable");
    expect(deltaETier(DELTA_E.indistinguishable)).toBe("close");
    expect(deltaETier(DELTA_E.close)).toBe("noticeable");
    expect(deltaETier(DELTA_E.noticeable)).toBe("far");
    expect(deltaETier(DELTA_E.far)).toBe("distant");
  });
});

describe("色の文言", () => {
  it("ΔE の段階と表示が対応する", () => {
    expect(colorMatchText(0).title).toBe("見分けがつきません");
    expect(colorMatchText(DELTA_E.identical).title).toBe("並べても違いは分かりにくい色です");
    expect(colorMatchText(DELTA_E.indistinguishable).title).toBe("かなり近い色です（塗ればほぼ同じ）");
    expect(colorMatchText(DELTA_E.close).title).toBe("少し違う色です");
    expect(colorMatchText(DELTA_E.noticeable).title).toBe("別の色です");

    expect(colorMatchBadge(DELTA_E.identical)).toBe("ほぼ同じ色");
    expect(colorMatchBadge(DELTA_E.indistinguishable)).toBe("かなり近い");
    expect(colorMatchBadge(DELTA_E.close)).toBe("少し違う");
    expect(colorMatchBadge(DELTA_E.noticeable)).toBe("別の色");

    expect(colorSearchBadge(DELTA_E.indistinguishable)).toBe("かなり近い");
    expect(colorSearchBadge(DELTA_E.noticeable)).toBe("やや離れた色");
    expect(colorSearchBadge(DELTA_E.far)).toBe("写真の色とは離れた色");

    expect(deltaELabel(0)).toBe("肉眼では区別できない");
    expect(deltaELabel(DELTA_E.indistinguishable)).toBe("似ている（単体では見分けにくい）");
    expect(deltaELabel(DELTA_E.noticeable)).toBe("別の色");
  });

  it("「似ている」と言う範囲と判定の既定値がそろっている", () => {
    expect(PALETTE_COVERAGE.max_delta_e).toBe(DELTA_E.close);
    expect(SHADE.dedupe_delta_e).toBe(DELTA_E.indistinguishable);
    expect(colorMatchBadge(PALETTE_COVERAGE.max_delta_e - EPS)).toBe("かなり近い");
  });
});

describe("処方の文言", () => {
  it("cosine 類似度の段階と表示が対応する", () => {
    expect(formulaSimTier(FORMULA_SIM.same)).toBe("same");
    expect(formulaSimTier(FORMULA_SIM.same - EPS)).toBe("very_close");
    expect(formulaSimTier(FORMULA_SIM.partial - EPS)).toBe("different");

    expect(formulaMatchText(FORMULA_SIM.same)).toBe("中身はほとんど同じ処方です");
    expect(formulaMatchText(FORMULA_SIM.very_close)).toBe("中身はかなり似た処方です");
    expect(formulaMatchText(FORMULA_SIM.close)).toBe("似た処方です");
    expect(formulaMatchText(FORMULA_SIM.partial)).toBe("一部の成分が共通しています");
    expect(formulaMatchText(0)).toBe("処方は違います");

    expect(formulaMatchBadge(FORMULA_SIM.close)).toBe("中身似てる");
    expect(formulaMatchBadge(FORMULA_SIM.partial)).toBe("中身は違う");
  });
});

describe("SQL 側のしきい値", () => {
  const sql = readFileSync(
    new URL("../../supabase/migrations/20260819000100_thresholds.sql", import.meta.url),
    "utf8",
  );
  const json: Record<string, Record<string, number>> = raw;

  it("生成済みマイグレーションが thresholds.json と一致する", () => {
    for (const [section, values] of Object.entries(json)) {
      for (const [key, value] of Object.entries(values)) {
        expect(sql).toContain(`when '${section}.${key}' then ${value}::double precision`);
      }
    }
  });

  it("SQL が参照するキーが JSON に存在する", () => {
    const keys = [...sql.matchAll(/threshold\('([^']+)'\)/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const [section, name] = key.split(".");
      expect(json[section]).toHaveProperty(name);
    }
  });
});
