"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { addToStash } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABEL, type Product } from "@/lib/types";

type Status = "idle" | "scanning" | "found" | "unknown" | "error";

function barcodeHints() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128]);
  return hints;
}

export default function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [jan, setJan] = useState("");
  const [hit, setHit] = useState<Product | null>(null);
  const [candidates, setCandidates] = useState<Product[]>([]);
  const router = useRouter();

  useEffect(() => () => controlsRef.current?.stop(), []);

  const lookup = async (code: string) => {
    setJan(code);
    const supabase = createClient();
    const columns =
      "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

    const { data } = await supabase.from("products").select(columns).eq("jan", code).maybeSingle<Product>();
    if (data) {
      setHit(data);
      setCandidates([]);
      setStatus("found");
      return;
    }

    // JAN マスタに無い場合は候補から手で選ばせる。ここで詰まらせないのが大事。
    const { data: all } = await supabase.from("products").select(columns).limit(60).returns<Product[]>();
    setHit(null);
    setCandidates(all ?? []);
    setStatus("unknown");
  };

  const start = async () => {
    setStatus("scanning");
    setMessage("");
    try {
      const reader = new BrowserMultiFormatReader(barcodeHints());
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (!result) return;
        controlsRef.current?.stop();
        void lookup(result.getText());
      });
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error ? `カメラを開けませんでした: ${e.message}` : "カメラを開けませんでした",
      );
    }
  };

  // カメラが無い環境でも、印刷したバーコードの写真から読めるようにする。
  const decodeFile = async (file: File) => {
    setStatus("scanning");
    setMessage("");
    const url = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader(barcodeHints());
      const result = await reader.decodeFromImageUrl(url);
      await lookup(result.getText());
    } catch {
      setStatus("error");
      setMessage("画像からバーコードを読み取れませんでした");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const register = async (productId: number) => {
    const res = await addToStash(productId);
    if (res.ok) router.push("/stash");
    else setMessage(res.error ?? "登録に失敗しました");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={start} className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white">
            カメラでスキャン
          </button>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (jan) void lookup(jan);
            }}
          >
            <input
              value={jan}
              onChange={(e) => setJan(e.target.value)}
              placeholder="JANコードを手入力（例 4901234000018）"
              className="w-64 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
              検索
            </button>
          </form>
          <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            バーコード画像から読み取る
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void decodeFile(file);
              }}
            />
          </label>
        </div>
        <video ref={videoRef} className={`mt-3 w-full rounded-xl bg-black ${status === "scanning" ? "" : "hidden"}`} />
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      </div>

      {status === "found" && hit && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">JAN {jan} で一致</div>
          <div className="mt-1 font-medium">
            {hit.brands?.name} {hit.name}
          </div>
          <div className="text-sm text-neutral-600">
            {CATEGORY_LABEL[hit.category]} ・ ¥{hit.price_yen.toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => register(hit.id)}
            className="mt-3 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            手持ちに登録
          </button>
        </div>
      )}

      {status === "unknown" && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="font-medium text-amber-900">JAN {jan} は商品マスタにありません</div>
          <p className="text-sm text-amber-900">
            日本のコスメには自由に使える JAN マスタが実質存在しません。読めなかった時は候補から選んで登録します。
          </p>
          <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
            {candidates.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => register(p.id)}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 text-left text-sm hover:border-neutral-400"
              >
                <span className="h-8 w-8 rounded border" style={{ background: p.color_hex ?? "#e5e5e5" }} />
                <span className="min-w-0">
                  <span className="block truncate">
                    {p.brands?.name} {p.name}
                  </span>
                  <span className="text-xs text-neutral-500">¥{p.price_yen.toLocaleString()}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
