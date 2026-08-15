import Link from "next/link";
import { notFound } from "next/navigation";
import ProductThumb from "@/components/ProductThumb";
import { deltaELabel } from "@/lib/color";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, type Product, type ShadeMatch } from "@/lib/types";
import { colorDifferenceText, colorName } from "@/lib/wording";

type Sort = "delta" | "price";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "delta", label: "色が近い順" },
  { value: "price", label: "安い順" },
];

const CHIP = "rounded-full border px-3 py-1.5 text-sm transition";
const CHIP_ON = "border-ink-900 bg-ink-900 text-white";
const CHIP_OFF = "border-ink-200 bg-white text-ink-600 hover:border-ink-400";

export default async function ShadeMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string; pos: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { productId: productIdParam, pos: posParam } = await params;
  const productId = Number(productIdParam);
  const pos = Number(posParam);
  if (!Number.isInteger(productId) || !Number.isInteger(pos)) notFound();

  const sort: Sort = (await searchParams).sort === "price" ? "price" : "delta";
  const supabase = await createClient();

  const [{ data: product }, matchRes] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,category,price_yen,image_url,brands(name),product_colors(pos,shade_name,hex)")
      .eq("id", productId)
      .maybeSingle<
        Pick<Product, "id" | "name" | "category" | "price_yen" | "image_url" | "brands" | "product_colors">
      >(),
    supabase.rpc("find_shade_matches", { p_product_id: productId, p_pos: pos, p_limit: 30 }),
  ]);

  if (!product) notFound();
  const source = (product.product_colors ?? []).find((color) => color.pos === pos);
  if (!source) notFound();

  const matches = (matchRes.data ?? []) as ShadeMatch[];
  const sorted =
    sort === "price"
      ? [...matches].sort((a, b) => a.price_yen - b.price_yen || a.delta_e - b.delta_e)
      : matches;
  const cheaper = matches.filter((match) => match.price_diff < 0);

  return (
    <div className="space-y-6">
      <section className="space-y-3 border-b border-ink-200 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold">この色に近い、他ブランドの色</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            持っている色番を起点に、他商品のシェードを CIEDE2000 の色差 ΔE で並べています。
            写真から探すときと違い、登録済みの色をそのまま使うので照明のずれが入りません。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4">
          <span
            className="swatch h-12 w-12 shrink-0 rounded-2xl"
            style={{ background: source.hex }}
          />
          <div className="min-w-0">
            <div className="text-[11px] text-ink-400">
              {product.brands?.name} ・ {CATEGORY_LABEL[product.category]}
            </div>
            <Link href={`/products/${product.id}`} className="truncate text-sm font-bold underline">
              {product.name}
            </Link>
            <div className="text-xs text-ink-600">
              {source.shade_name}（{colorName(source.hex)}） ・ ¥{product.price_yen.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink-400">並び替え</span>
          {SORT_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={
                option.value === "delta"
                  ? `/shades/${productId}/${pos}`
                  : `/shades/${productId}/${pos}?sort=${option.value}`
              }
              className={`${CHIP} ${sort === option.value ? CHIP_ON : CHIP_OFF}`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        {matches.length === 0 ? (
          <p className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
            この色に相当するシェードは見つかりませんでした。持っている色が珍しい色か、
            同じカテゴリの登録商品が少ないかのどちらかです。
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-600">
              {matches.length}件が同じ色の範囲にあります。
              {cheaper.length > 0 && `そのうち${cheaper.length}件は今より安く買えます。`}
            </p>
            <ul className="space-y-2">
              {sorted.map((match) => (
                <li key={`${match.product_id}-${match.pos}`}>
                  <Link
                    href={`/products/${match.product_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3"
                  >
                    <ProductThumb
                      category={match.category}
                      colors={[{ pos: match.pos, shade_name: match.shade_name, hex: match.shade_hex }]}
                      imageUrl={match.image_url}
                      size={56}
                      className="shrink-0 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-ink-400">{match.brand}</div>
                      <div className="truncate text-sm font-bold">{match.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="flex items-center gap-1 rounded-full bg-plum-100 px-2 py-0.5 text-plum-700">
                          <span
                            className="swatch inline-block h-3 w-3 rounded-full"
                            style={{ background: match.shade_hex }}
                          />
                          {match.shade_name}
                        </span>
                        <span className="rounded-full bg-ink-50 px-2 py-0.5 tabular-nums text-ink-600">
                          ΔE {match.delta_e.toFixed(1)}・{deltaELabel(match.delta_e)}
                        </span>
                        {match.owned && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700">
                            持っています
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-ink-400">
                        {colorDifferenceText(source.hex, match.shade_hex)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-medium tabular-nums">
                        ¥{match.price_yen.toLocaleString()}
                      </div>
                      <div
                        className={`text-xs font-bold tabular-nums ${
                          match.price_diff < 0 ? "text-emerald-600" : "text-ink-400"
                        }`}
                      >
                        {match.price_diff === 0
                          ? "同じねだん"
                          : match.price_diff < 0
                            ? `−¥${Math.abs(match.price_diff).toLocaleString()}`
                            : `+¥${match.price_diff.toLocaleString()}`}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
