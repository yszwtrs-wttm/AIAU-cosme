import Link from "next/link";
import ProductThumb from "@/components/ProductThumb";
import { CATEGORY_LABEL, type AllergenFreeAlternative, type StashAllergenHit } from "@/lib/types";
import { colorMatchBadge, formulaMatchBadge } from "@/lib/wording";

export type AllergenCheckRow = {
  hit: StashAllergenHit;
  alternatives: AllergenFreeAlternative[];
};

export default function StashAllergenCheck({
  rows,
  checkedCount,
  avoidedCount,
}: {
  rows: AllergenCheckRow[];
  checkedCount: number;
  avoidedCount: number;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold">避けたい成分の点検</h2>

      {avoidedCount === 0 ? (
        <p className="rounded-2xl border border-ink-200 bg-white p-4 text-sm text-ink-600">
          避けたい成分を登録すると、ポーチ全体をまとめて点検できます。{" "}
          <Link href="/settings" className="font-bold text-brand-600 underline">
            避けたい成分を登録する
          </Link>
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          手持ち{checkedCount}点を点検しました。避けたい成分が入っているものはありません。
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-600">
            手持ち{checkedCount}点のうち{rows.length}点に、避けたい成分が入っています。
            使うのをやめる前に、成分が近くてその成分を含まない候補も出しています。
          </p>
          {rows.map(({ hit, alternatives }) => (
            <article
              key={hit.product_id}
              className="space-y-3 rounded-2xl border border-rose-200 bg-white p-4"
            >
              <Link href={`/products/${hit.product_id}`} className="flex gap-3">
                <ProductThumb
                  category={hit.category}
                  colors={hit.color_hex ? [{ pos: 0, shade_name: "本体色", hex: hit.color_hex }] : []}
                  imageUrl={hit.image_url}
                  size={64}
                  className="rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                    <span className="truncate">{hit.brand}</span>
                    <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-brand-600">
                      {CATEGORY_LABEL[hit.category]}
                    </span>
                  </div>
                  <div className="truncate text-sm font-bold">{hit.name}</div>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {hit.hit_ingredients.map((ingredient) => (
                      <li
                        key={ingredient}
                        className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700"
                      >
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>

              {alternatives.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-ink-600">この成分が入っていない、近いもの</p>
                  {alternatives.map((alt) => (
                    <Link
                      key={alt.product_id}
                      href={`/products/${alt.product_id}`}
                      className="flex items-center gap-3 rounded-xl bg-ink-50 p-2.5"
                    >
                      <span
                        className="swatch h-10 w-10 shrink-0 rounded-xl"
                        style={{ background: alt.color_hex ?? "#e9e2e6" }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] text-ink-400">{alt.brand}</span>
                        <span className="block truncate text-sm font-bold">{alt.name}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                            {formulaMatchBadge(alt.ing_sim)}
                          </span>
                          {alt.delta_e !== null && (
                            <span className="rounded-full bg-plum-100 px-2 py-0.5 text-plum-700">
                              {colorMatchBadge(alt.delta_e)}
                            </span>
                          )}
                          {alt.owned && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                              手持ち
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-medium tabular-nums">
                          ¥{alt.price_yen.toLocaleString()}
                        </span>
                        {alt.price_diff !== 0 && (
                          <span
                            className={`block text-xs font-bold tabular-nums ${
                              alt.price_diff < 0 ? "text-emerald-600" : "text-ink-400"
                            }`}
                          >
                            {alt.price_diff < 0 ? "−" : "+"}¥
                            {Math.abs(alt.price_diff).toLocaleString()}
                          </span>
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-400">
                  この成分を含まない近い商品は見つかりませんでした。同じ用途の別カテゴリで代えるか、使う量を減らす判断になります。
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
