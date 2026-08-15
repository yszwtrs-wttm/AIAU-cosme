import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import { CATEGORY_LABEL, type Product } from "@/lib/types";
import { colorName } from "@/lib/wording";

export default function ProductCard({ product }: { product: Product }) {
  const shades = [...(product.product_colors ?? [])].sort((a, b) => a.pos - b.pos);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex gap-3 rounded-xl border border-ink-200 bg-ink-0 p-3 transition "
    >
      <ProductThumb
        category={product.category}
        colors={shades}
        imageUrl={product.image_url}
        size={64}
        className="rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
          <span className="truncate">{product.brands?.name}</span>
          <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-brand-600">
            {CATEGORY_LABEL[product.category]}
          </span>
          {product.is_mens && (
            <span className="rounded-full bg-ink-900 px-1.5 py-0.5 text-[10px] text-ink-0">MEN</span>
          )}
        </div>
        <div className="truncate text-sm font-bold">{product.name}</div>
        <div className="font-mono text-sm font-medium tabular-nums text-ink-600">
          ¥{product.price_yen.toLocaleString()}
        </div>
        {shades.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            {shades.slice(0, 6).map((s) => (
              <span
                key={s.pos}
                title={`${s.shade_name}（${colorName(s.hex)}）`}
                className="swatch inline-block h-4 w-4 rounded-full"
                style={{ background: s.hex }}
              />
            ))}
            {shades.length > 6 && (
              <span className="text-[10px] text-ink-500">+{shades.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
