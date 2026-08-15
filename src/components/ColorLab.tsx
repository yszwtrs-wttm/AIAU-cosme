"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { extractPalette, labArray, type ExtractedColor } from "@/lib/color";
import { CATEGORY_LABEL, type ColorMatch } from "@/lib/types";
import { colorName, colorSearchBadge, dedupeShades, hueGroup, sortBySkinTone } from "@/lib/wording";

const CATEGORIES = [
  { value: "lip", label: "リップ" },
  { value: "eyeshadow", label: "アイシャドウ" },
  { value: "foundation", label: "ファンデーション" },
  { value: "all", label: "すべて" },
];

/**
 * 写真を選ぶ → 色を選ぶ → 近いコスメを見る、の3ステップ。
 * HEX や ΔE は画面に出さず、色見本と言葉だけで選べるようにする。
 */
export default function ColorLab({ skinToneHex }: { skinToneHex?: string | null }) {
  const [hex, setHex] = useState<string | null>(null);
  const [matches, setMatches] = useState<ColorMatch[]>([]);
  const [category, setCategory] = useState("lip");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedColor[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const search = async (targetHex: string, cat: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("find_by_color", {
      p_lab: labArray(targetHex),
      p_category: cat === "all" ? undefined : cat,
      p_limit: 8,
    });
    setMatches((data ?? []) as ColorMatch[]);
    setLoading(false);
  };

  const onFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const w = 160;
      const h = Math.max(1, Math.round((img.height / img.width) * w));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      // ほぼ同じ色が並ぶと選べないので、見分けのつく色だけ残す。
      const palette = dedupeShades(extractPalette(ctx.getImageData(0, 0, w, h).data), 4);
      setExtracted(palette);
      const first = palette[0]?.hex;
      if (first) {
        setHex(first);
        void search(first, category);
      }
    };
    img.src = url;
  };

  // ファンデは「なりたい色」より肌の色に近いほうが正解なので、並べ替える。
  const shown =
    skinToneHex && category === "foundation"
      ? sortBySkinTone(
          matches.map((m) => ({ ...m, hex: m.shade_hex ?? m.color_hex ?? "#e9e2e6" })),
          skinToneHex,
        )
      : matches;
  const best = category === "foundation" ? shown[0] : null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-ink-200 bg-ink-0 p-5">
        <div className="font-mono text-xs font-semibold text-brand-600">STEP 1 ／ 写真を選ぶ</div>
        <p className="mt-1 text-sm text-ink-600">
          なりたい色が写っている写真（好きなメイク・服・小物など）を選んでください。
        </p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-ink-0">
          <ImagePlus size={15} /> 写真を選ぶ
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="選んだ写真" className="mt-3 max-h-48 rounded-xl" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </section>

      {extracted.length > 0 && (
        <section className="rounded-xl border border-ink-200 bg-ink-0 p-5">
          <div className="font-mono text-xs font-semibold text-brand-600">STEP 2 ／ 使いたい色を選ぶ</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {extracted.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => {
                  setHex(c.hex);
                  void search(c.hex, category);
                }}
                className={`flex items-center gap-2 rounded-xl border bg-ink-0 px-2.5 py-2 text-[11px] ${
                  hex?.toLowerCase() === c.hex.toLowerCase()
                    ? "border-brand-400"
                    : "border-brand-100"
                }`}
              >
                <span className="swatch inline-block h-8 w-8 rounded-full" style={{ background: c.hex }} />
                <span className="text-left">
                  <span className="block font-bold">{colorName(c.hex)}</span>
                  <span className="text-ink-500">{hueGroup(c.hex)}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setCategory(c.value);
                  if (hex) void search(hex, c.value);
                }}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  category === c.value
                    ? "border-transparent bg-brand-600 text-ink-0"
                    : "border-brand-100 bg-ink-0 text-ink-600"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {hex && (
        <section className="space-y-2">
          <div className="font-mono text-xs font-semibold text-brand-600">STEP 3 ／ 近いコスメ</div>
          {loading && <p className="text-sm text-ink-500">探しています…</p>}

          {best && (
            <div className="rounded-xl bg-brand-50 p-4">
              <div className="text-sm font-bold text-brand-700">
                あなたに近いのは「{best.shade_name ?? best.name}」です
              </div>
              <p className="mt-1 text-xs text-ink-600">
                {skinToneHex
                  ? "登録した肌の色に近い順で選んでいます。"
                  : "プロフィールで肌の色を選ぶと、もっと近い番号を出せます。"}
              </p>
            </div>
          )}

          <p className="text-[11px] text-ink-500">
            写真の色に近い順に並んでいます。写真の色は照明やカメラで変わるので、目安として使ってください。
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shown.map((m, i) => (
              <Link
                key={`${m.product_id}-${m.shade_name ?? ""}`}
                href={`/products/${m.product_id}`}
                className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-0 p-3 transition "
              >
                <span
                  className="swatch inline-block h-12 w-12 shrink-0 rounded-full"
                  style={{ background: m.shade_hex ?? m.color_hex ?? "#e9e2e6" }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-ink-500">
                    {m.brand} ・ {CATEGORY_LABEL[m.category]}
                  </span>
                  <span className="block truncate text-sm font-bold">
                    {m.name}
                    {m.shade_name && <span className="text-ink-500"> / {m.shade_name}</span>}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    {i === 0 && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-700">
                        この中でいちばん近い
                      </span>
                    )}
                    <span className="rounded-full bg-clay-100 px-2 py-0.5 text-clay-700">
                      {colorSearchBadge(m.delta_e)}
                    </span>
                  </span>
                </span>
                <span className="font-mono text-sm font-medium tabular-nums">¥{m.price_yen.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
