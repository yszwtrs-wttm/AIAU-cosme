"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { extractPalette, labArray, type ExtractedColor } from "@/lib/color";
import {
  PALETTE_MIN_DELTA,
  PALETTE_SAMPLE_WIDTH,
  sampleHeight,
  type PaletteResponse,
} from "@/lib/palette";
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
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedColor[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  // 写真を選び直したとき、古い抽出結果で上書きしないための世代番号。
  const requestIdRef = useRef(0);
  // Worker の返信は非同期なので、そのときのカテゴリを ref で読む。
  const categoryRef = useRef(category);
  categoryRef.current = category;

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

  const applyPalette = useCallback(
    (palette: ExtractedColor[], cat: string) => {
      setExtracted(palette);
      setExtracting(false);
      const first = palette[0]?.hex;
      if (first) {
        setHex(first);
        void search(first, cat);
      }
    },
    // search は state の setter しか閉じ込めないので依存に入れない（毎レンダー作り直されるため）。
    [],
  );

  /** Worker + OffscreenCanvas が使えない環境向けの、これまで通りのメインスレッド処理。 */
  const extractOnMainThread = (url: string, cat: string, id: number) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const w = PALETTE_SAMPLE_WIDTH;
      const h = sampleHeight(img.width, img.height);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      // ほぼ同じ色が並ぶと選べないので、見分けのつく色だけ残す。
      const palette = dedupeShades(extractPalette(ctx.getImageData(0, 0, w, h).data), PALETTE_MIN_DELTA);
      if (id !== requestIdRef.current) return;
      applyPalette(palette, cat);
    };
    img.onerror = () => {
      if (id === requestIdRef.current) setExtracting(false);
    };
    img.src = url;
  };

  const getWorker = (): Worker | null => {
    if (typeof Worker === "undefined" || typeof createImageBitmap === "undefined") return null;
    if (typeof OffscreenCanvas === "undefined") return null;
    if (workerRef.current) return workerRef.current;
    try {
      const worker = new Worker(new URL("../lib/palette.worker.ts", import.meta.url));
      worker.addEventListener("message", (event: MessageEvent<PaletteResponse>) => {
        const res = event.data;
        if (res.id !== requestIdRef.current) return;
        if ("error" in res) {
          setExtracting(false);
          return;
        }
        applyPalette(res.palette, categoryRef.current);
      });
      workerRef.current = worker;
      return worker;
    } catch {
      return null;
    }
  };

  const onFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreview(url);
    setExtracting(true);
    const id = ++requestIdRef.current;

    const worker = getWorker();
    if (!worker) {
      extractOnMainThread(url, category, id);
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      if (id !== requestIdRef.current) {
        bitmap.close();
        return;
      }
      worker.postMessage({ id, bitmap }, [bitmap]);
    } catch {
      extractOnMainThread(url, category, id);
    }
  };

  // 選び直しとアンマウントで objectURL を解放しないとメモリが積み上がる。
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

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
      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="text-xs font-bold text-brand-600">STEP 1 ／ 写真を選ぶ</div>
        <p className="mt-1 text-sm text-ink-600">
          なりたい色が写っている写真（好きなメイク・服・小物など）を選んでください。
        </p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white">
          <ImagePlus size={15} /> 写真を選ぶ
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="選んだ写真" className="mt-3 max-h-48 rounded-2xl" />
        )}
        {extracting && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-400">
            <Loader2 size={14} className="animate-spin" /> 写真の色を調べています…
          </p>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </section>

      {extracted.length > 0 && (
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="text-xs font-bold text-brand-600">STEP 2 ／ 使いたい色を選ぶ</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {extracted.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => {
                  setHex(c.hex);
                  void search(c.hex, category);
                }}
                className={`flex items-center gap-2 rounded-2xl border bg-white px-2.5 py-2 text-[11px] ${
                  hex?.toLowerCase() === c.hex.toLowerCase()
                    ? "border-brand-400"
                    : "border-brand-100"
                }`}
              >
                <span className="swatch inline-block h-8 w-8 rounded-full" style={{ background: c.hex }} />
                <span className="text-left">
                  <span className="block font-bold">{colorName(c.hex)}</span>
                  <span className="text-ink-400">{hueGroup(c.hex)}</span>
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
                    ? "border-transparent bg-brand-600 text-white"
                    : "border-brand-100 bg-white text-ink-600"
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
          <div className="text-xs font-bold text-brand-600">STEP 3 ／ 近いコスメ</div>
          {loading && <p className="text-sm text-ink-400">探しています…</p>}

          {best && (
            <div className="rounded-2xl bg-brand-soft p-4">
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

          <p className="text-[11px] text-ink-400">
            写真の色に近い順に並んでいます。写真の色は照明やカメラで変わるので、目安として使ってください。
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shown.map((m, i) => (
              <Link
                key={`${m.product_id}-${m.shade_name ?? ""}`}
                href={`/products/${m.product_id}`}
                className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 transition "
              >
                <span
                  className="swatch inline-block h-12 w-12 shrink-0 rounded-full"
                  style={{ background: m.shade_hex ?? m.color_hex ?? "#e9e2e6" }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-ink-400">
                    {m.brand} ・ {CATEGORY_LABEL[m.category]}
                  </span>
                  <span className="block truncate text-sm font-bold">
                    {m.name}
                    {m.shade_name && <span className="text-ink-400"> / {m.shade_name}</span>}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    {i === 0 && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-700">
                        この中でいちばん近い
                      </span>
                    )}
                    <span className="rounded-full bg-plum-100 px-2 py-0.5 text-plum-700">
                      {colorSearchBadge(m.delta_e)}
                    </span>
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums">¥{m.price_yen.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
