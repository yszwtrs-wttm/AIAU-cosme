"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Search, Send } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { addToStash, requestProduct } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABEL, type Product } from "@/lib/types";

type Status = "idle" | "scanning" | "found" | "unknown" | "error";

const COLUMNS =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

/**
 * 連続スキャン。1本ごとにカメラを止めず、読めたらそのまま登録して次に進める。
 * 「1個ずつ登録が面倒」を減らすのが目的。
 */
export default function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [jan, setJan] = useState("");
  const [hit, setHit] = useState<Product | null>(null);
  const [candidates, setCandidates] = useState<Product[]>([]);
  const [registered, setRegistered] = useState<Product[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [requestName, setRequestName] = useState("");
  const [requestBrand, setRequestBrand] = useState("");
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestedJan, setRequestedJan] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => () => controlsRef.current?.stop(), []);

  const register = async (product: Product, source: "scan" | "manual") => {
    const res = await addToStash(product.id, source);
    if (!res.ok) {
      setMessage(res.error ?? "登録に失敗しました");
      return;
    }
    setRegistered((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
  };

  const lookup = async (code: string, auto: boolean) => {
    setJan(code);
    const supabase = createClient();

    const { data } = await supabase.from("products").select(COLUMNS).eq("jan", code).maybeSingle<Product>();
    if (data) {
      setHit(data);
      setCandidates([]);
      setStatus("found");
      if (auto) await register(data, "scan");
      return;
    }

    // JAN マスタに無い場合は候補から手で選ばせる。ここで詰まらせないのが大事。
    const { data: all } = await supabase.from("products").select(COLUMNS).limit(60).returns<Product[]>();
    setHit(null);
    setCandidates(all ?? []);
    setNameQuery("");
    setRequestName("");
    setRequestBrand("");
    setRequestFile(null);
    setRequestError(null);
    setRequestedJan(null);
    setStatus("unknown");
  };

  /** 未登録 JAN の受け皿。名前で近い商品を探す導線。 */
  const searchByName = async (query: string) => {
    const keyword = query.trim();
    if (!keyword) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select(COLUMNS)
      .ilike("name", `%${keyword}%`)
      .limit(30)
      .returns<Product[]>();
    setCandidates(data ?? []);
  };

  /** JAN + 任意の写真・商品名を商品リクエストとして残す。 */
  const sendRequest = async () => {
    setRequestBusy(true);
    setRequestError(null);

    let imagePath: string | null = null;
    if (requestFile) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const ext = requestFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${jan}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("jan-requests")
          .upload(path, requestFile, { upsert: true });
        if (!upErr) imagePath = path;
      }
    }

    const res = await requestProduct({
      jan,
      productName: requestName,
      brandName: requestBrand,
      imagePath,
    });
    setRequestBusy(false);
    if (!res.ok) {
      setRequestError(res.error ?? "リクエストを送れませんでした");
      return;
    }
    setRequestedJan(jan);
  };

  const start = async () => {
    setStatus("scanning");
    setMessage("");
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128]);
      const reader = new BrowserMultiFormatReader(hints);
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (!result || busyRef.current) return;
        busyRef.current = true;
        void lookup(result.getText(), true).finally(() => {
          // 同じコードを連続で拾わないよう、少し間を置いてから次を受け付ける。
          setTimeout(() => {
            busyRef.current = false;
          }, 1500);
        });
      });
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? `カメラを開けませんでした: ${e.message}` : "カメラを開けませんでした");
    }
  };

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("idle");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          {status === "scanning" ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-600"
            >
              スキャンを終わる
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <Camera size={15} /> スキャンする
            </button>
          )}
          <form
            className="flex w-full gap-2 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              if (jan) void lookup(jan, false);
            }}
          >
            <input
              value={jan}
              onChange={(e) => setJan(e.target.value)}
              placeholder="バーコードの数字を手入力"
              className="min-w-0 flex-1 rounded-full border border-brand-100 px-4 py-2.5 text-sm outline-none focus:border-brand-300 sm:w-56 sm:flex-none"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-brand-200 bg-white px-3 py-2.5 text-sm"
            >
              <Search size={14} /> 探す
            </button>
          </form>
        </div>
        <p className="mt-2 text-xs text-ink-400">
          カメラは開いたままにできます。パッケージを次々かざすと、そのままポーチに入っていきます。
        </p>
        <video
          ref={videoRef}
          className={`mt-3 w-full rounded-2xl bg-black ${status === "scanning" ? "" : "hidden"}`}
        />
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      </div>

      {registered.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="font-bold text-emerald-900">{registered.length}点をポーチに入れました</div>
          <ul className="mt-2 space-y-1 text-sm text-emerald-900">
            {registered.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5">
                <Check size={14} /> {p.brands?.name} {p.name}
              </li>
            ))}
          </ul>
          <Link
            href="/stash"
            className="mt-3 inline-block rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
          >
            Myポーチを見る
          </Link>
        </div>
      )}

      {status === "found" && hit && !registered.some((p) => p.id === hit.id) && (
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="text-xs text-ink-400">読み取ったバーコード {jan}</div>
          <div className="mt-1 font-bold">
            {hit.brands?.name} {hit.name}
          </div>
          <div className="text-sm text-ink-600">
            {CATEGORY_LABEL[hit.category]} ・ ¥{hit.price_yen.toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => void register(hit, "manual")}
            className="mt-3 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white"
          >
            ポーチに入れる
          </button>
        </div>
      )}

      {status === "unknown" && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="font-bold text-amber-900">このバーコードは登録がありません</div>
          <div className="text-xs text-amber-800">読み取ったバーコード {jan}</div>

          {requestedJan === jan ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="flex items-center gap-1.5 font-bold">
                <Check size={15} /> リクエストを受け付けました
              </div>
              <p className="mt-1">商品として登録されたら通知します。</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2 rounded-2xl border border-amber-200 bg-white p-4">
              <div className="text-sm font-bold">この商品を登録してほしいと伝える</div>
              <p className="text-xs text-ink-400">
                商品名と写真は分かる範囲で。バーコードの数字だけでも送れます。
              </p>
              <input
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                placeholder="商品名（任意）"
                className="w-full rounded-full border border-brand-100 px-4 py-2.5 text-sm outline-none focus:border-brand-300"
              />
              <input
                value={requestBrand}
                onChange={(e) => setRequestBrand(e.target.value)}
                placeholder="ブランド名（任意）"
                className="w-full rounded-full border border-brand-100 px-4 py-2.5 text-sm outline-none focus:border-brand-300"
              />
              <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-2 text-sm">
                <ImagePlus size={14} />
                {requestFile ? requestFile.name : "写真を選ぶ（任意）"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setRequestFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                disabled={requestBusy}
                onClick={() => void sendRequest()}
                className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <Send size={14} /> {requestBusy ? "送信中…" : "リクエストを送る"}
              </button>
              {requestError && <p className="text-sm text-red-600">{requestError}</p>}
            </div>
          )}

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void searchByName(nameQuery);
            }}
          >
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="近い商品を名前で探す"
              className="min-w-0 flex-1 rounded-full border border-brand-100 px-4 py-2.5 text-sm outline-none focus:border-brand-300"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-brand-200 bg-white px-3 py-2.5 text-sm"
            >
              <Search size={14} /> 探す
            </button>
          </form>
          <p className="mt-2 text-sm text-amber-900">似ている商品を下から選んで登録できます。</p>
          <div className="mt-2 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {candidates.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void register(p, "manual")}
                className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-2 text-left text-sm"
              >
                <span
                  className="swatch inline-block h-8 w-8 rounded-full"
                  style={{ background: p.color_hex ?? "#e9e2e6" }}
                />
                <span className="min-w-0">
                  <span className="block truncate">
                    {p.brands?.name} {p.name}
                  </span>
                  <span className="text-xs text-ink-400">¥{p.price_yen.toLocaleString()}</span>
                </span>
              </button>
            ))}
            {candidates.length === 0 && (
              <p className="text-sm text-amber-900">名前に合う商品が見つかりませんでした。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
