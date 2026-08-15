"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Sparkles } from "lucide-react";
import { applyDiagnosis } from "@/app/actions";
import { skinToneFromImageData } from "@/lib/color";
import {
  MIN_COLOR_ITEMS_FOR_DIAGNOSIS,
  confidenceLabel,
  diagnoseStash,
  nearestSkinTonePreset,
} from "@/lib/diagnose";
import {
  PERSONAL_COLOR_LABEL,
  SKIN_TYPE_LABEL,
  type Product,
  type Profile,
} from "@/lib/types";

type Applied = "personalColor" | "skinType" | "skinTone";

/**
 * 質問に答える診断の代わりに、ポーチの中身から傾向を出して提案する。
 * 反映はワンタップだが、押すまでプロフィールは書き換えない。
 */
export default function StashDiagnosis({
  products,
  profile,
}: {
  products: Product[];
  profile: Profile | null;
}) {
  const router = useRouter();
  const diagnosis = useMemo(() => diagnoseStash(products), [products]);
  const [applied, setApplied] = useState<Applied[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selfieHex, setSelfieHex] = useState<string | null>(null);
  const [selfieError, setSelfieError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const apply = (key: Applied, input: Parameters<typeof applyDiagnosis>[0]) => {
    setError(null);
    startTransition(async () => {
      const res = await applyDiagnosis(input);
      if (!res.ok) {
        setError(res.error ?? "反映できませんでした");
        return;
      }
      setApplied((current) => [...current, key]);
      router.refresh();
    });
  };

  const onSelfie = (file: File) => {
    setSelfieError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const w = 200;
      const h = Math.max(1, Math.round((img.height / img.width) * w));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const hex = skinToneFromImageData(ctx.getImageData(0, 0, w, h).data, w, h);
      URL.revokeObjectURL(url);
      if (!hex) {
        setSelfieError("肌の色を読み取れませんでした。顔が中央に写った明るい写真だと読み取れます。");
        return;
      }
      setSelfieHex(hex);
    };
    img.src = url;
  };

  const suggestedTone = selfieHex ? nearestSkinTonePreset(selfieHex) : null;
  const colorGuess = diagnosis.personalColor;
  const skinGuess = diagnosis.skinType;

  return (
    <section className="space-y-3 rounded-2xl border border-brand-100 bg-brand-soft p-5">
      <div>
        <h2 className="flex items-center gap-1.5 font-display text-lg font-bold">
          <Sparkles size={16} className="text-brand-600" /> 手持ちからの診断
        </h2>
        <p className="text-xs text-ink-600">
          質問には答えなくていい。ポーチに入っている色と処方から傾向を出します。反映するまで設定は変わりません。
        </p>
      </div>

      {colorGuess ? (
        <div className="space-y-2 rounded-2xl bg-white p-4">
          <div className="text-sm font-bold text-brand-700">{colorGuess.headline}</div>
          <div className="flex flex-wrap gap-1.5">
            {colorGuess.samples.map((sample) => (
              <span
                key={sample.hex}
                className="flex items-center gap-1.5 rounded-full border border-brand-100 px-2 py-1 text-[11px]"
              >
                <span
                  className="swatch inline-block h-5 w-5 rounded-full"
                  style={{ background: sample.hex }}
                />
                {sample.name}
              </span>
            ))}
          </div>
          <ul className="space-y-0.5 text-xs text-ink-600">
            {colorGuess.reasons.map((reason) => (
              <li key={reason}>・{reason}</li>
            ))}
            <li>・{confidenceLabel(colorGuess.confidence)}</li>
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending || applied.includes("personalColor")}
              onClick={() => apply("personalColor", { personalColor: colorGuess.personalColor })}
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {applied.includes("personalColor") ? <Check size={14} /> : null}
              {applied.includes("personalColor")
                ? "反映しました"
                : `「${PERSONAL_COLOR_LABEL[colorGuess.personalColor]}」として反映`}
            </button>
            {profile?.personal_color && (
              <span className="text-[11px] text-ink-400">
                いまの設定：{PERSONAL_COLOR_LABEL[profile.personal_color]}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-xs text-ink-600">
          リップやアイシャドウをあと
          {Math.max(1, MIN_COLOR_ITEMS_FOR_DIAGNOSIS - diagnosis.colorItemCount)}
          点登録すると、色の傾向を出せます。
        </p>
      )}

      {skinGuess && (
        <div className="space-y-2 rounded-2xl bg-white p-4">
          <div className="text-sm font-bold text-brand-700">{skinGuess.headline}</div>
          <ul className="space-y-0.5 text-xs text-ink-600">
            {skinGuess.reasons.map((reason) => (
              <li key={reason}>・{reason}</li>
            ))}
            <li>・{confidenceLabel(skinGuess.confidence)}</li>
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending || applied.includes("skinType")}
              onClick={() => apply("skinType", { skinType: skinGuess.skinType })}
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {applied.includes("skinType") ? <Check size={14} /> : null}
              {applied.includes("skinType")
                ? "反映しました"
                : `肌の状態を「${SKIN_TYPE_LABEL[skinGuess.skinType]}」にする`}
            </button>
            {profile?.skin_type && (
              <span className="text-[11px] text-ink-400">
                いまの設定：{SKIN_TYPE_LABEL[profile.skin_type]}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-2xl bg-white p-4">
        <div className="text-sm font-bold text-brand-700">自撮りから肌の色を読み取る</div>
        <p className="text-xs text-ink-600">
          写真は端末の中だけで処理します（アップロードしません）。顔が中央に写った写真を選んでください。
        </p>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-brand-200 px-4 py-2 text-xs font-bold text-brand-700">
          <Camera size={14} /> 写真を選ぶ
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onSelfie(e.target.files[0])}
          />
        </label>
        <canvas ref={canvasRef} className="hidden" />
        {selfieError && <p className="text-xs text-red-600">{selfieError}</p>}
        {suggestedTone && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-brand-100 px-2 py-1 text-[11px]">
              <span
                className="swatch inline-block h-5 w-5 rounded-full"
                style={{ background: suggestedTone.hex }}
              />
              {suggestedTone.label}
            </span>
            <button
              type="button"
              disabled={pending || applied.includes("skinTone")}
              onClick={() => apply("skinTone", { skinToneHex: suggestedTone.hex })}
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {applied.includes("skinTone") ? <Check size={14} /> : null}
              {applied.includes("skinTone") ? "反映しました" : "肌のトーンとして反映"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
