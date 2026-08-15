import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

type ProductRow = { id: number; name: string; category: string; price_yen: number };
type DupeRow = { product_id: number; brand: string; name: string; score: number };

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase ${path} が失敗しました（${res.status}）: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** 未ログイン閲覧の確認に使う、シードの中の1商品。 */
export async function someProduct(): Promise<ProductRow> {
  const products = await rest<ProductRow[]>(
    "products?select=id,name,category,price_yen&order=id.asc&limit=1",
  );
  if (!products[0]) throw new Error("商品が入っていません。npm run db:reset を実行してください。");
  return products[0];
}

export type DupePair = {
  /** 「これから買おうとしている商品」。 */
  target: ProductRow;
  /** target と処方・色が近く、ポーチに入れておく商品。 */
  owned: DupeRow;
};

/**
 * シードのどの商品が被るかはハードコードせず、`find_cheaper_dupes` に選ばせる。
 * 商品データが変わってもテストが壊れないようにするため。
 */
export async function findDupePair(): Promise<DupePair> {
  const products = await rest<ProductRow[]>(
    "products?select=id,name,category,price_yen&order=price_yen.desc&limit=40",
  );

  for (const target of products) {
    const dupes = await rest<DupeRow[]>("rpc/find_cheaper_dupes", {
      method: "POST",
      body: JSON.stringify({ p_product_id: target.id, p_limit: 1 }),
    });
    if (dupes[0]) return { target, owned: dupes[0] };
  }

  throw new Error("被り判定に使える商品の組み合わせが見つかりませんでした");
}
