import type { Category, ProductColor } from "@/lib/types";

/**
 * 店頭では同じ一覧を行き来しながら見比べるので、検索条件・スクロール位置・
 * 最近見た商品をブラウザ側に持たせる。サーバーには保存しない。
 */

export type RecentProduct = {
  id: number;
  name: string;
  brand: string;
  category: Category;
  imageUrl: string | null;
  colors: ProductColor[];
};

const QUERY_KEY = "kawanai.search-query";
const RECENT_KEY = "kawanai.recent-products";
const SCROLL_PREFIX = "kawanai.scroll.";
const RECENT_MAX = 12;
/** 買い物1回ぶんを超えたら、前の位置に戻されると逆に邪魔になる。 */
const SCROLL_TTL_MS = 30 * 60 * 1000;

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberSearchQuery(query: string): void {
  local()?.setItem(QUERY_KEY, query);
}

export function readSearchQuery(): string {
  return local()?.getItem(QUERY_KEY) ?? "";
}

export function rememberScrollTop(key: string, top: number): void {
  session()?.setItem(SCROLL_PREFIX + key, JSON.stringify({ top, at: Date.now() }));
}

export function readScrollTop(key: string): number {
  const raw = session()?.getItem(SCROLL_PREFIX + key);
  if (!raw) return 0;
  try {
    const saved = JSON.parse(raw) as { top?: unknown; at?: unknown };
    const top = typeof saved.top === "number" ? saved.top : 0;
    const at = typeof saved.at === "number" ? saved.at : 0;
    return Date.now() - at > SCROLL_TTL_MS ? 0 : top;
  } catch {
    return 0;
  }
}

function isRecentProduct(value: unknown): value is RecentProduct {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Partial<RecentProduct>;
  return typeof product.id === "number" && typeof product.name === "string";
}

export function readRecentProducts(): RecentProduct[] {
  const raw = local()?.getItem(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isRecentProduct).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function rememberRecentProduct(product: RecentProduct): void {
  const next = [product, ...readRecentProducts().filter((item) => item.id !== product.id)].slice(
    0,
    RECENT_MAX,
  );
  try {
    local()?.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // 容量超過なら履歴は諦める。
  }
}
