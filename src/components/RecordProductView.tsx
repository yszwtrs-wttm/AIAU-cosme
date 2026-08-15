"use client";

import { useEffect } from "react";
import { rememberRecentProduct, type RecentProduct } from "@/lib/browsing";

/** 閲覧履歴はブラウザだけに残す。商品詳細を開いた時点で先頭に積む。 */
export default function RecordProductView({ product }: { product: RecentProduct }) {
  useEffect(() => {
    rememberRecentProduct(product);
    // 商品が変わったときだけ記録する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return null;
}
