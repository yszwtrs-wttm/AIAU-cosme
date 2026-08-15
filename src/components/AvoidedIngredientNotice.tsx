import { AlertTriangle } from "lucide-react";
import IngredientDisclaimer from "@/components/IngredientDisclaimer";
import { ROLE_SHORT_LABEL, resolveIngredient, sourcesOf } from "@/lib/ingredients";

/**
 * 「避けたい成分」に登録した成分が入っていたときの注意。名前を並べるだけでは
 * 何を気にすべきか伝わらないので、役割と「なぜ避けたい人がいるのか」も一緒に出す。
 */
export default function AvoidedIngredientNotice({
  ingredients,
}: {
  /** 登録した避けたい成分のうち、この商品に入っていたもの。 */
  ingredients: { inci: string; nameJa: string | null }[];
}) {
  if (ingredients.length === 0) return null;

  const resolved = ingredients.map((ingredient, i) => {
    const base = resolveIngredient(ingredient.inci.toUpperCase(), i + 1);
    return { ...base, ja: ingredient.nameJa || base.ja };
  });

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
        <AlertTriangle size={13} className="shrink-0" />
        避けたい成分が入っています
      </p>
      <ul className="space-y-2">
        {resolved.map((item) => (
          <li key={item.inci} className="text-xs leading-relaxed">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-bold text-rose-900">{item.ja}</span>
              <span className="rounded-full bg-white px-1.5 text-[10px] text-rose-700">
                {ROLE_SHORT_LABEL[item.role]}
              </span>
            </div>
            <p className="text-ink-600">{item.avoid ?? item.caution ?? item.effect}</p>
          </li>
        ))}
      </ul>
      <IngredientDisclaimer sources={sourcesOf(resolved)} className="border-rose-200 bg-white" />
    </div>
  );
}
