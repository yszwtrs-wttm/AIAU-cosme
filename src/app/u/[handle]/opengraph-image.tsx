import { ImageResponse } from "next/og";
import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OgFrame, OgStat, OgSwatches, ogFonts } from "@/lib/og";
import { createAnonClient } from "@/lib/supabase/anon";
import { PERSONAL_COLOR_LABEL, SKIN_TYPE_LABEL, type Profile } from "@/lib/types";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "KAWANAI のユーザーページ";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = createAnonClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle<Profile>();

  if (!profile) {
    const fonts = await ogFonts("ユーザーが見つかりませんでした");
    return new ImageResponse(
      (
        <OgFrame badge="ユーザー">
          <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>
            ユーザーが見つかりませんでした
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE, fonts },
    );
  }

  const [{ count: stashCount }, { count: reviewCount }] = await Promise.all([
    supabase
      .from("user_items")
      .select("product_id", { count: "exact", head: true })
      .eq("user_id", profile.user_id),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.user_id)
      .eq("excluded", false),
  ]);

  const traits = [
    profile.skin_type ? SKIN_TYPE_LABEL[profile.skin_type] : null,
    profile.personal_color ? PERSONAL_COLOR_LABEL[profile.personal_color] : null,
  ].filter((t): t is string => Boolean(t));

  const fonts = await ogFonts(
    `${profile.display_name}${profile.handle}${traits.join("")}公開しているポーチ書いた口コミ点件非公開KAWANAI 成分ベクトルと色差 ΔE(CIEDE2000) で「もう持っている」を数値にするアプリ`,
  );

  return new ImageResponse(
    (
      <OgFrame badge="ポーチ">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {profile.skin_tone_hex && <OgSwatches colors={[profile.skin_tone_hex]} size={72} />}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>
                {profile.display_name}
              </div>
              <div style={{ display: "flex", fontSize: 26, color: OG_COLORS.inkSoft }}>
                @{profile.handle}
              </div>
            </div>
          </div>
          {traits.length > 0 && (
            <div style={{ display: "flex", fontSize: 26, color: OG_COLORS.inkSoft }}>
              {traits.join(" ・ ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 16 }}>
            <OgStat
              label="公開しているポーチ"
              value={profile.stash_public ? `${stashCount ?? 0}` : "非公開"}
              unit={profile.stash_public ? "点" : undefined}
            />
            <OgStat label="書いた口コミ" value={`${reviewCount ?? 0}`} unit="件" />
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts },
  );
}
