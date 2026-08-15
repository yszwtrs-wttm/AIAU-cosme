"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import {
  SKIN_TONE_LIGHTING_NOTE,
  estimateSkinTone,
  skinToneWords,
  type SkinToneEstimate,
} from "@/lib/skin";
import { PERSONAL_COLOR_LABEL, type PersonalColor } from "@/lib/types";

/**
 * 自撮りから肌トーンを提案する。採用するかはユーザーが決める前提なので、
 * 提案は候補として出すだけで、プロフィールの値は onPick が呼ばれたときだけ動かす。
 */
export default function SkinToneCapture({
  selectedHex,
  onPick,
  onPickPersonalColor,
}: {
  selectedHex: string;
  onPick: (hex: string) => void;
  onPickPersonalColor: (personalColor: PersonalColor) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<SkinToneEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    setBusy(true);
    setError(null);
    setEstimate(null);
    const url = URL.createObjectURL(file);
    setPreview(url);

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = 220;
      const h = Math.max(1, Math.round((img.height / img.width) * w));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const result = estimateSkinTone(ctx.getImageData(0, 0, w, h).data, w, h);
      setBusy(false);
      if (!result || result.coverage < 0.05) {
        setError("顔の部分をうまく見つけられませんでした。顔が大きく写った、明るい写真で試してください。");
        return;
      }
      setEstimate(result);
    };
    img.onerror = () => {
      setBusy(false);
      setError("画像を読み込めませんでした");
    };
    img.src = url;
  };

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
      <div className="text-[11px] font-bold text-brand-700">自撮りから肌トーンを取り込む</div>
      <p className="mt-1 text-[11px] text-ink-500">
        頬と額あたりの色を平均して、肌トーンとパーソナルカラーの候補を出します。採用するかは自分で決められます。
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-white px-3 py-1.5 text-[11px] font-bold text-brand-700">
          <Camera size={13} /> 自撮りを選ぶ
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {busy && <span className="text-[11px] text-ink-400">解析中…</span>}
      </div>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="選んだ自撮り" className="mt-2 max-h-32 rounded-2xl" />
      )}
      <canvas ref={canvasRef} className="hidden" />

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}

      {estimate && (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] text-ink-600">
            提案：<span className="font-bold">{skinToneWords(estimate.lab)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {estimate.candidates.map((candidate) => (
              <button
                key={candidate.hex}
                type="button"
                onClick={() => onPick(candidate.hex)}
                className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] ${
                  selectedHex.toLowerCase() === candidate.hex.toLowerCase()
                    ? "border-brand-400 bg-white"
                    : "border-brand-100 bg-white"
                }`}
              >
                <span
                  className="swatch inline-block h-5 w-5 rounded-full"
                  style={{ background: candidate.hex }}
                />
                {candidate.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onPickPersonalColor(estimate.personalColor)}
            className="rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] text-brand-700"
          >
            パーソナルカラーの候補「{PERSONAL_COLOR_LABEL[estimate.personalColor]}」を使う
          </button>
          <p className="text-[11px] text-ink-400">{SKIN_TONE_LIGHTING_NOTE}</p>
        </div>
      )}
    </div>
  );
}
