export type Category = "lip" | "foundation" | "shampoo" | "treatment" | "sunscreen" | "bb";

export const CATEGORY_LABEL: Record<Category, string> = {
  lip: "リップ",
  foundation: "ファンデーション",
  shampoo: "シャンプー",
  treatment: "トリートメント",
  sunscreen: "日焼け止め",
  bb: "BBクリーム",
};

export type Product = {
  id: number;
  name: string;
  category: Category;
  is_mens: boolean;
  price_yen: number;
  volume: number | null;
  volume_unit: string | null;
  jan: string | null;
  image_url: string | null;
  color_hex: string | null;
  ingredients: string[];
  brands: { name: string } | null;
};

export type DupeRow = {
  product_id: number;
  brand: string;
  name: string;
  category?: Category;
  price_yen: number;
  color_hex: string | null;
  image_url: string | null;
  ing_sim: number;
  delta_e: number | null;
  score: number;
  price_diff?: number;
  savings?: number;
};

export type StashOverlap = {
  a_id: number;
  a_label: string;
  a_price: number;
  a_hex: string | null;
  b_id: number;
  b_label: string;
  b_price: number;
  b_hex: string | null;
  ing_sim: number;
  delta_e: number | null;
  score: number;
};

export type Review = {
  id: number;
  product_id: number;
  author_name: string;
  rating: number;
  body: string;
  posted_at: string;
  trust_score: number;
  excluded: boolean;
  flags: string[];
  image_phash: string | null;
};

export type RatingSummary = {
  product_id: number;
  review_count: number;
  raw_rating: number | null;
  adjusted_rating: number | null;
  excluded_count: number;
  exclusion_reasons: string[];
};

export const FLAG_LABEL: Record<string, string> = {
  similar_text: "同一文体クラスタ",
  burst: "短時間の高評価バースト",
  brand_bias: "同一ブランドへの偏重投稿",
  pr_boilerplate: "PR・案件の定型表現",
  image_reuse: "画像の使い回し",
};

export type ColorMatch = {
  product_id: number;
  brand: string;
  name: string;
  category: Category;
  price_yen: number;
  color_hex: string | null;
  image_url: string | null;
  delta_e: number;
};
