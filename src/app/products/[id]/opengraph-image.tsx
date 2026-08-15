import { ImageResponse } from "next/og";
import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OgFrame, OgStat, OgSwatches, ogFonts, shadeHexes } from "@/lib/og";
import { yen } from "@/lib/pass";
import { createAnonClient } from "@/lib/supabase/anon";
import { CATEGORY_LABEL, type Product, type RatingSummary } from "@/lib/types";
import { colorName } from "@/lib/wording";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "KAWANAI の商品ページ";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  const supabase = createAnonClient();

  const [{ data: product }, { data: summary }] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,category,price_yen,color_hex,brands(name),product_colors(pos,shade_name,hex)")
      .eq("id", productId)
      .maybeSingle<
        Pick<Product, "id" | "name" | "category" | "price_yen" | "color_hex" | "brands" | "product_colors">
      >(),
    supabase
      .from("product_rating_summary")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle<RatingSummary>(),
  ]);

  if (!product) {
    const fonts = await ogFonts("商品が見つかりませんでした");
    return new ImageResponse(
      (
        <OgFrame badge="商品">
          <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>
            商品が見つかりませんでした
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE, fonts },
    );
  }

  const shades = shadeHexes(product.product_colors, product.color_hex);
  const brand = product.brands?.name ?? "";
  const category = CATEGORY_LABEL[product.category];
  const mainColor = shades[0] ? colorName(shades[0]) : null;
  const rating = summary?.adjusted_rating != null ? summary.adjusted_rating.toFixed(1) : "—";

  const fonts = await ogFonts(
    `${product.name}${brand}${category}${mainColor ?? ""}ねだん信用できる口コミの評価色数商品件KAWANAI 成分ベクトルと色差 ΔE(CIEDE2000) で「もう持っている」を数値にするアプリ`,
  );

  return new ImageResponse(
    (
      <OgFrame badge={category}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 26, color: OG_COLORS.inkSoft }}>{brand}</div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>
            {product.name}
          </div>
          {shades.length > 0 && <OgSwatches colors={shades} />}
          <div style={{ display: "flex", gap: 16 }}>
            <OgStat label="ねだん" value={yen(product.price_yen)} />
            <OgStat
              label="信用できる口コミの評価"
              value={rating}
              unit={summary?.counted_count ? `${summary.counted_count}件` : "口コミなし"}
            />
            <OgStat
              label="色数"
              value={`${shades.length}`}
              unit={mainColor ?? undefined}
            />
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts },
  );
}
