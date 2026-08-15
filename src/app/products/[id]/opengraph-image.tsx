import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, loadJpFont } from "@/lib/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";
import { CATEGORY_LABEL, type Product } from "@/lib/types";
import { colorName } from "@/lib/wording";

export const alt = "ブランド名・商品名・色見本・価格が入った商品カード";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type OgProduct = Pick<Product, "name" | "category" | "price_yen" | "color_hex" | "brands" | "product_colors">;

/** SNS に貼られたときに、ブランド名・商品名・色見本・価格が一目で分かる画像を作る。 */
export default async function Image({ params }: { params: { id: string } }) {
  const productId = Number(params.id);
  let product: OgProduct | null = null;

  if (Number.isFinite(productId)) {
    const { data } = await createPublicClient()
      .from("products")
      .select("name,category,price_yen,color_hex,brands(name),product_colors(pos,shade_name,hex)")
      .eq("id", productId)
      .maybeSingle<OgProduct>();
    product = data;
  }

  const brand = product?.brands?.name ?? "";
  const name = product?.name ?? "商品が見つかりません";
  const category = product ? CATEGORY_LABEL[product.category] : "";
  const price = product ? `¥${product.price_yen.toLocaleString("ja-JP")}` : "";

  const allShades = [...(product?.product_colors ?? [])].sort((a, b) => a.pos - b.pos);
  const shades = allShades.slice(0, 5);
  const swatches: { hex: string; label: string }[] =
    shades.length > 0
      ? shades.map((shade) => ({ hex: shade.hex, label: shade.shade_name || colorName(shade.hex) }))
      : product?.color_hex
        ? [{ hex: product.color_hex, label: colorName(product.color_hex) }]
        : [];
  const restShades = allShades.length - shades.length;

  // 商品名は長さの幅が大きいので、行数が増えすぎないように文字数で落とす。
  const nameSize = name.length > 26 ? 52 : name.length > 16 ? 62 : 76;
  const footer = "成分と色で「買わなくていい」を判定";
  const restLabel = restShades > 0 ? `他${restShades}色` : "";
  const text = [
    SITE_NAME,
    SITE_TAGLINE,
    brand,
    name,
    category,
    price,
    footer,
    restLabel,
    ...swatches.map((s) => s.label),
  ].join("");
  const font = await loadJpFont(text);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #fff1f6 0%, #f7f0ff 100%)",
          color: "#241d22",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#d92668", letterSpacing: 2 }}>
              {SITE_NAME}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#8b8189" }}>{SITE_TAGLINE}</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#8b8189" }}>{footer}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34, color: "#5b5158" }}>
            <div style={{ display: "flex" }}>{brand}</div>
            {category && (
              <div
                style={{
                  display: "flex",
                  borderRadius: 999,
                  background: "#ffffff",
                  border: "2px solid #ffc7dd",
                  padding: "6px 20px",
                  fontSize: 26,
                  color: "#b31852",
                }}
              >
                {category}
              </div>
            )}
          </div>
          <div style={{ display: "flex", fontSize: nameSize, fontWeight: 700, lineHeight: 1.15 }}>{name}</div>
          {price && <div style={{ display: "flex", fontSize: 54, fontWeight: 700, color: "#d92668" }}>{price}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 20 }}>
            {swatches.map((swatch) => (
              <div
                key={swatch.hex + swatch.label}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 132 }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 108,
                    height: 108,
                    borderRadius: 999,
                    background: swatch.hex,
                    border: "6px solid #ffffff",
                    boxShadow: "0 10px 24px -10px rgba(120, 23, 62, 0.45)",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    maxWidth: 132,
                    fontSize: 21,
                    color: "#5b5158",
                    overflow: "hidden",
                    textAlign: "center",
                  }}
                >
                  {swatch.label}
                </div>
              </div>
            ))}
            {restLabel && (
              <div style={{ display: "flex", alignItems: "center", height: 108, fontSize: 26, color: "#5b5158" }}>
                {restLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Noto Sans JP", data: font, weight: 700, style: "normal" }] : undefined,
    },
  );
}
