export type Category =
  | "lip"
  | "foundation"
  | "shampoo"
  | "treatment"
  | "sunscreen"
  | "bb"
  | "eyeshadow";

export const CATEGORY_LABEL: Record<Category, string> = {
  lip: "リップ",
  foundation: "ファンデーション",
  shampoo: "シャンプー",
  treatment: "トリートメント",
  sunscreen: "日焼け止め",
  bb: "BBクリーム",
  eyeshadow: "アイシャドウ",
};

export type ProductColor = {
  pos: number;
  shade_name: string;
  hex: string;
};

export type IngredientMaster = {
  id: number;
  name_ja: string | null;
  inci: string;
};

export type PersonalColor = "spring" | "summer" | "autumn" | "winter";

export const PERSONAL_COLOR_LABEL: Record<PersonalColor, string> = {
  spring: "イエベ春",
  summer: "ブルベ夏",
  autumn: "イエベ秋",
  winter: "ブルベ冬",
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
  product_colors?: ProductColor[];
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

export type Profile = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_hue: number;
  avatar_url: string | null;
  bio: string | null;
  skin_tone_hex: string | null;
  skin_type: SkinType | null;
  personal_color: PersonalColor | null;
  stash_public: boolean;
  created_at: string;
};

export type SkinType = "dry" | "normal" | "oily" | "combination" | "sensitive";

export const SKIN_TYPE_LABEL: Record<SkinType, string> = {
  dry: "乾燥しやすい",
  normal: "ふつう",
  oily: "皮脂が出やすい",
  combination: "混合（部分的にテカる）",
  sensitive: "ゆらぎやすい",
};

export type ReviewImage = {
  id: number;
  review_id: number;
  path: string;
  pos: number;
};

export type Review = {
  id: number;
  product_id: number;
  user_id: string | null;
  author_name: string;
  rating: number;
  body: string;
  posted_at: string;
  trust_score: number;
  excluded: boolean;
  flags: string[];
  image_phash: string | null;
  feel: Record<string, number> | null;
  report_count: number;
  /** 投稿時にポーチに登録していたか。集計の重みと表示に使う（投稿条件ではない） */
  owner_verified: boolean;
  profiles?: Pick<
    Profile,
    | "handle"
    | "display_name"
    | "avatar_hue"
    | "avatar_url"
    | "skin_type"
    | "skin_tone_hex"
  > | null;
  review_images?: ReviewImage[];
};

export type RatingSummary = {
  product_id: number;
  review_count: number;
  raw_rating: number | null;
  adjusted_rating: number | null;
  excluded_count: number;
  /** 点数に入っている口コミの数 */
  counted_count: number;
  /** そのうち、投稿時にポーチに登録していた人の数 */
  owner_count: number;
  exclusion_reasons: string[];
};

export type ProductScore = {
  product_id: number;
  counted_count: number;
  adjusted_rating: number | null;
  /** 件数が少ない商品を上に出さないよう補正した評価 */
  ranked_rating: number | null;
};

export const FLAG_LABEL: Record<string, string> = {
  similar_text: "似た文章のくり返し",
  burst: "短時間の高評価の連投",
  brand_bias: "同じブランドへの高評価の集中",
  pr_boilerplate: "宣伝・案件の定型文",
  image_reuse: "写真の使い回し",
  reported: "通報が多い",
};

/** 投稿者本人に見せる、その理由が付いた根拠の説明 */
export const FLAG_DETAIL: Record<string, string> = {
  similar_text: "同じ商品の他の口コミと文章がよく似ています。テンプレートを使った投稿と区別できません。",
  burst: "同じ商品に短い間（24時間以内）で満点の口コミが集中していて、その一つになっています。",
  brand_bias: "同じブランドの商品に満点の口コミを3件以上つけています。",
  pr_boilerplate: "「PR」「提供」「案件」など、宣伝でよく使われる言葉が本文に入っています。",
  image_reuse: "添付した写真が、他の口コミの写真と同じものと判定されました。",
  reported: "他の利用者からの通報が3件以上あります。",
};

export type AppealStatus = "open" | "restored" | "kept";

export type ReviewAppeal = {
  id: number;
  review_id: number;
  message: string;
  status: AppealStatus;
  flags_before: string[];
  flags_after: string[];
  created_at: string;
  judged_at: string | null;
};

export type FeelSummary = {
  product_id: number;
  feel_count: number;
  feel: Record<string, number> | null;
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
  shade_name: string | null;
  shade_hex: string | null;
};

export type PaletteCoverage = {
  pos: number;
  shade_name: string;
  shade_hex: string;
  owned_product_id: number | null;
  owned_label: string | null;
  owned_shade: string | null;
  owned_hex: string | null;
  delta_e: number | null;
};
