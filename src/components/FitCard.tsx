import Link from "next/link";
import { Check, CircleAlert, HelpCircle, Plus } from "lucide-react";
import { FIT_CONFIDENCE_LABEL, type Fit, type FitConfidence, type FitLevel, type FitMaterial } from "@/lib/fit";

const TONE: Record<Fit["verdict"], { box: string; text: string }> = {
  good: { box: "border-emerald-200 bg-emerald-50", text: "text-emerald-900" },
  caution: { box: "border-amber-200 bg-amber-50", text: "text-amber-900" },
  unknown: { box: "border-ink-200 bg-ink-0", text: "text-ink-900" },
};

const ICON = {
  good: Check,
  caution: CircleAlert,
  unknown: HelpCircle,
} as const;

const CONFIDENCE_BOX: Record<FitConfidence, string> = {
  high: "bg-emerald-100 text-emerald-800",
  mid: "bg-amber-100 text-amber-800",
  low: "bg-ink-100 text-ink-600",
};

const LEVEL_COLOR: Record<FitLevel["level"], string> = {
  3: "bg-emerald-500",
  2: "bg-amber-400",
  1: "bg-clay-500",
  0: "bg-ink-200",
};

/** 判定の材料。使ったものは値を出し、未登録のものは登録導線にする。 */
function MaterialChip({ material }: { material: FitMaterial }) {
  const body = (
    <>
      {material.swatch && (
        <span
          className="swatch inline-block h-3.5 w-3.5 rounded-full"
          style={{ background: material.swatch }}
        />
      )}
      <span className="font-bold">{material.label}</span>
      <span className={material.status === "used" ? "text-ink-600" : "text-ink-500"}>
        {material.detail}
      </span>
      {material.status === "missing" && <Plus size={12} />}
    </>
  );

  if (material.status === "missing" && material.href) {
    return (
      <Link
        href={material.href}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-brand-300 bg-ink-0 px-2.5 py-1 text-[11px] text-brand-700"
      >
        {body}
      </Link>
    );
  }

  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
        material.status === "used"
          ? "border-ink-200 bg-ink-0 text-ink-700"
          : "border-ink-100 bg-ink-50 text-ink-500"
      }`}
    >
      {body}
    </span>
  );
}

/** 「どのくらい」を3段階のバーで見せる。 */
function LevelRow({ level }: { level: FitLevel }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="flex shrink-0 gap-0.5" aria-hidden>
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={`h-1.5 w-3 rounded-full ${
              level.level >= step ? LEVEL_COLOR[level.level] : "bg-ink-100"
            }`}
          />
        ))}
      </span>
      <span className="w-28 shrink-0 font-bold">{level.label}</span>
      <span className="text-ink-600">{level.text}</span>
    </li>
  );
}

/** 商品ページの結論。成分表と色から言えることだけを書く。 */
export default function FitCard({ fit, hasProfile }: { fit: Fit; hasProfile: boolean }) {
  const tone = TONE[fit.verdict];
  const Icon = ICON[fit.verdict];
  const materialsUsed = fit.materials.filter((m) => m.status === "used");
  const missing = fit.materials.filter((m) => m.status === "missing");

  return (
    <div className={`rounded-xl border p-4 ${tone.box}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`flex items-center gap-2 text-base font-bold ${tone.text}`}>
          <Icon size={18} />
          {fit.headline}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${CONFIDENCE_BOX[fit.confidence]}`}
        >
          信頼度 {FIT_CONFIDENCE_LABEL[fit.confidence]}（材料{materialsUsed.length}/{fit.materials.length}）
        </span>
      </div>

      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-ink-900">
        {fit.reasons.map((r) => (
          <li key={r.text} className="flex gap-1.5">
            <span
              className={
                r.tone === "plus"
                  ? "text-emerald-600"
                  : r.tone === "minus"
                    ? "text-amber-600"
                    : "text-ink-500"
              }
            >
              {r.tone === "minus" ? "−" : r.tone === "plus" ? "＋" : "・"}
            </span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 rounded-xl bg-ink-0/70 p-3">
        <p className="text-[11px] font-bold text-ink-500">判定に使った材料</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {fit.materials.map((material) => (
            <li key={material.key}>
              <MaterialChip material={material} />
            </li>
          ))}
        </ul>
        {missing.length > 0 && (
          <p className="mt-2 text-[11px] text-ink-500">
            点線のチップを登録すると、判定に使える材料が増えます。
          </p>
        )}
      </div>

      {fit.levels.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-xs">
          {fit.levels.map((level) => (
            <LevelRow key={level.label} level={level} />
          ))}
        </ul>
      )}

      {fit.shade && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span
            className="swatch inline-block h-7 w-7 rounded-full"
            style={{ background: fit.shade.hex }}
          />
          <span className="font-bold">{fit.shade.shade_name}</span>
          <span className="text-xs text-ink-500">肌の色にいちばん近い番号</span>
        </div>
      )}

      {!hasProfile && (
        <Link href="/settings" className="mt-3 inline-block text-xs font-bold text-brand-600">
          肌の状態と肌の色を登録する
        </Link>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
        成分表と色から言えることだけを書いています。肌に合うかは人によって違うので、心配な点は必ず現物で確かめてください。
      </p>
    </div>
  );
}
