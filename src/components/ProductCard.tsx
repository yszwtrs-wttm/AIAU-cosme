import Link from "next/link";
import { CATEGORY_LABEL, type Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-400"
    >
      <div
        className="h-14 w-14 shrink-0 rounded-lg border border-neutral-200"
        style={{ background: product.color_hex ?? "linear-gradient(135deg,#eee,#ddd)" }}
      />
      <div className="min-w-0">
        <div className="text-xs text-neutral-500">
          {product.brands?.name} ・ {CATEGORY_LABEL[product.category]}
          {product.is_mens && <span className="ml-1 rounded bg-neutral-900 px-1 text-[10px] text-white">MEN</span>}
        </div>
        <div className="truncate text-sm font-medium">{product.name}</div>
        <div className="text-sm tabular-nums">¥{product.price_yen.toLocaleString()}</div>
      </div>
    </Link>
  );
}
