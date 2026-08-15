import { Info } from "lucide-react";
import { INGREDIENT_DISCLAIMER, SOURCES, type Source } from "@/lib/ingredients";

/**
 * 成分の解説を出す画面すべてで使う、出典と免責の表示。
 * 「診断ではない・パッチテストを勧める」を必ず同じ文言で見せたいので共通化する。
 */
export default function IngredientDisclaimer({
  sources = Object.values(SOURCES),
  className = "",
}: {
  sources?: Source[];
  className?: string;
}) {
  return (
    <div
      className={`flex gap-1.5 rounded-2xl border border-ink-100 bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-600 ${className}`}
    >
      <Info size={13} className="mt-0.5 shrink-0" />
      <div>
        <p>{INGREDIENT_DISCLAIMER}</p>
        {sources.length > 0 && (
          <p className="mt-1">
            出典：
            {sources.map((source, i) => (
              <span key={source.id}>
                {i > 0 && "、"}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-brand-700"
                >
                  {source.name}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
