/**
 * OG 画像（next/og）の共通部分。
 *
 * SNS のカードは説明文を読まれない前提なので、数値と色を画像そのものに焼き込む。
 * ImageResponse は日本語のフォントを内蔵していないため、必要な文字だけ
 * Google Fonts から取り出して埋め込む（text= で部分集合にすると数十 KB で済む）。
 */

import type { ProductColor } from "./types";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const OG_COLORS = {
  ink: "#241d22",
  inkSoft: "#5b5158",
  brand: "#d92668",
  brandSoft: "#fff1f6",
  line: "#ece7e9",
};

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: "normal";
};

async function loadGoogleFont(weight: 400 | 700 | 900, text: string): Promise<ArrayBuffer | null> {
  // User-Agent を送らないと truetype の URL が返る。satori は woff2 を読めないのでこれが必要。
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&text=${encodeURIComponent(text)}`;
  try {
    const css = await fetch(cssUrl, { cache: "force-cache" }).then((r) => r.text());
    const src = /src:\s*url\(([^)]+)\)/.exec(css)?.[1];
    if (!src) return null;
    return await fetch(src, { cache: "force-cache" }).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * 画像に出す文字だけを含むフォントを用意する。
 * 取得できなかったときは undefined を返し、ImageResponse 内蔵のフォント（英数のみ）に任せる。
 */
export async function ogFonts(text: string): Promise<OgFont[] | undefined> {
  const chars = [...new Set(`${text}0123456789.,%¥ΔE()〜/円色`)].join("");
  const [regular, bold] = await Promise.all([
    loadGoogleFont(400, chars),
    loadGoogleFont(700, chars),
  ]);

  const fonts: OgFont[] = [];
  if (regular) fonts.push({ name: "Noto Sans JP", data: regular, weight: 400, style: "normal" });
  if (bold) fonts.push({ name: "Noto Sans JP", data: bold, weight: 700, style: "normal" });
  return fonts.length > 0 ? fonts : undefined;
}

/** カード全体の枠。左に太いブランドの帯を置き、下にサービス名を出す。 */
export function OgFrame({ children, badge }: { children: React.ReactNode; badge: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        backgroundImage: "linear-gradient(135deg, #fff1f6 0%, #f7f0ff 100%)",
        padding: 56,
        fontFamily: "Noto Sans JP",
        color: OG_COLORS.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 6,
            color: OG_COLORS.brand,
          }}
        >
          KAWANAI
        </div>
        <div
          style={{
            display: "flex",
            borderRadius: 999,
            backgroundColor: OG_COLORS.brand,
            color: "#ffffff",
            fontSize: 22,
            fontWeight: 700,
            padding: "6px 18px",
          }}
        >
          {badge}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {children}
      </div>
      <div style={{ display: "flex", fontSize: 22, color: OG_COLORS.inkSoft }}>
        成分ベクトルと色差 ΔE(CIEDE2000) で「もう持っている」を数値にするアプリ
      </div>
    </div>
  );
}

/** 数値を大きく出すタイル。SNS の縮小表示でも読めるように 1 枚 3 個までにする。 */
export function OgStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        gap: 6,
        borderRadius: 24,
        backgroundColor: "#ffffff",
        border: `2px solid ${OG_COLORS.line}`,
        padding: "18px 24px",
      }}
    >
      <div style={{ display: "flex", fontSize: 22, color: OG_COLORS.inkSoft }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <div style={{ display: "flex", fontSize: 46, fontWeight: 700 }}>{value}</div>
        {unit && (
          <div style={{ display: "flex", fontSize: 24, color: OG_COLORS.inkSoft }}>{unit}</div>
        )}
      </div>
    </div>
  );
}

/** 色見本。数値と一緒に「見た目が同じ」ことを示す。 */
export function OgSwatches({ colors, size = 56 }: { colors: string[]; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {colors.slice(0, 10).map((hex, i) => (
        <div
          key={`${hex}-${i}`}
          style={{
            display: "flex",
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: hex,
            border: "3px solid #ffffff",
          }}
        />
      ))}
    </div>
  );
}

export function shadeHexes(colors: ProductColor[] | undefined, fallback: string | null): string[] {
  const list = [...(colors ?? [])].sort((a, b) => a.pos - b.pos).map((c) => c.hex);
  if (list.length > 0) return list;
  return fallback ? [fallback] : [];
}
