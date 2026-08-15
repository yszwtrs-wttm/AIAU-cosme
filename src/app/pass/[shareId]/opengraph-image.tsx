import { ImageResponse } from "next/og";
import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OgFrame, OgStat, OgSwatches, ogFonts } from "@/lib/og";
import { passEvidence, passHeadline, passStats } from "@/lib/pass";
import { createAnonClient } from "@/lib/supabase/anon";
import type { SharedPass } from "@/lib/types";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "KAWANAI の見送り記録";

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const supabase = createAnonClient();
  const { data } = await supabase.rpc("get_shared_pass", { p_share_id: shareId });
  const pass = ((data ?? []) as SharedPass[])[0] ?? null;

  if (!pass) {
    const fonts = await ogFonts("KAWANAI 見送り記録は見つかりませんでした");
    return new ImageResponse(
      (
        <OgFrame badge="見送り記録">
          <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>
            記録が見つかりませんでした
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE, fonts },
    );
  }

  const stats = passStats(pass);
  const headline = passHeadline(pass);
  const evidence = passEvidence(pass);
  const author = pass.author_name ? `@${pass.author_handle}` : "";
  const fonts = await ogFonts(
    `${headline}${evidence}${author}${pass.brand}${pass.name}${stats
      .map((s) => `${s.label}${s.value}${s.unit ?? ""}`)
      .join("")}見送り記録KAWANAI 成分ベクトルと色差 ΔE(CIEDE2000) で「もう持っている」を数値にするアプリ`,
  );

  return new ImageResponse(
    (
      <OgFrame badge="見送り記録">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>
            {headline}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {pass.color_hex && <OgSwatches colors={[pass.color_hex]} />}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 26, color: OG_COLORS.inkSoft }}>
                {pass.brand}
              </div>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>{pass.name}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {stats.map((stat) => (
              <OgStat key={stat.label} label={stat.label} value={stat.value} unit={stat.unit} />
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: OG_COLORS.inkSoft }}>
            {evidence}
            {author && ` ・ ${author}`}
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts },
  );
}
