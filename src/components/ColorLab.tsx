"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deltaELabel, dominantColorFromImageData, labArray } from "@/lib/color";
import { CATEGORY_LABEL, type ColorMatch } from "@/lib/types";

const PRESETS = [
  { label: "Supabase Green", hex: "#3ECF8E" },
  { label: "Devin", hex: "#1B1B1F" },
  { label: "テラコッタ", hex: "#B8604A" },
];

export default function ColorLab() {
  const [hex, setHex] = useState("#B8604A");
  const [matches, setMatches] = useState<ColorMatch[]>([]);
  const [category, setCategory] = useState<string>("lip");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
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
      const detected = dominantColorFromImageData(ctx.getImageData(0, 0, w, h).data);
      setHex(detected);
      void search(detected, category);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="text-sm"
          />
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="h-9 w-14 rounded border border-neutral-300"
          />
          <code className="rounded bg-neutral-100 px-2 py-1 text-sm">{hex.toUpperCase()}</code>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="lip">リップ</option>
            <option value="foundation">ファンデーション</option>
            <option value="all">すべて</option>
          </select>
          <button
            type="button"
            onClick={() => search(hex, category)}
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {loading ? "検索中…" : "この色に近いコスメを探す"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              onClick={() => {
                setHex(p.hex);
                void search(p.hex, category);
              }}
              className="flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1"
            >
              <span className="h-4 w-4 rounded-full border" style={{ background: p.hex }} />
              {p.label}
            </button>
          ))}
        </div>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="解析対象" className="mt-3 max-h-48 rounded-xl border border-neutral-200" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {matches.map((m) => (
          <Link
            key={m.product_id}
            href={`/products/${m.product_id}`}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 hover:border-neutral-400"
          >
            <span className="h-10 w-10 rounded-lg border" style={{ background: m.color_hex ?? "#e5e5e5" }} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-neutral-500">
                {m.brand} ・ {CATEGORY_LABEL[m.category]}
              </span>
              <span className="block truncate text-sm font-medium">{m.name}</span>
              <span className="text-xs tabular-nums text-neutral-600">
                ΔE {m.delta_e.toFixed(2)}・{deltaELabel(m.delta_e)}
              </span>
            </span>
            <span className="text-sm tabular-nums">¥{m.price_yen.toLocaleString()}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
