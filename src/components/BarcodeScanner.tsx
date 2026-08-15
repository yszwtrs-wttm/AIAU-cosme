"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Search } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { addToStash } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABEL, type Category, type Product } from "@/lib/types";

type Status = "idle" | "scanning" | "found" | "unknown" | "error";

type Candidate = { product: Product; sameMaker: boolean };

const COLUMNS =
  "id,name,category,is_mens,price_yen,volume,volume_unit,unit_price_yen,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";
const CANDIDATE_LIMIT = 24;
const CANDIDATE_CATEGORIES: Category[] = [
  "lip",
  "eyeshadow",
  "foundation",
  "bb",
  "sunscreen",
  "shampoo",
  "treatment",
];
const CHIP = "rounded-full border px-3 py-1 text-xs transition";
const CHIP_ON = "border-ink-900 bg-ink-900 text-white";
const CHIP_OFF = "border-ink-200 bg-white text-ink-600";
>>>>>>> origin/main

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
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [registered, setRegistered] = useState<Product[]>([]);
  /** 候補一覧の対象になっている、登録が無かったバーコード */
  const [unknownJan, setUnknownJan] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateCategory, setCandidateCategory] = useState<Category | "">("");
  const [searching, setSearching] = useState(false);

  useEffect(() => () => controlsRef.current?.stop(), []);

  const register = async (product: Product, source: "scan" | "manual") => {
    const res = await addToStash(product.id, source);
    if (!res.ok) {
      setMessage(res.error ?? "登録に失敗しました");
      return;
    }
    setRegistered((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
  };

  /**
   * 登録済みの商品から候補を出す。JANの先頭7桁（事業者コード）が同じものを先に並べ、
   * 残りを名前順で足す。名前・カテゴリで絞り込める。
   */
  const searchCandidates = useCallback(
    async (code: string, keyword: string, category: Category | "") => {
      const supabase = createClient();
      const withFilters = () => {
        let query = supabase.from("products").select(COLUMNS);
        if (keyword.trim()) query = query.ilike("name", `%${keyword.trim()}%`);
        if (category) query = query.eq("category", category);
        return query.order("name").limit(CANDIDATE_LIMIT);
      };

      const maker = code.replace(/\D/g, "").slice(0, 7);
      setSearching(true);
      const [{ data: sameMaker }, { data: rest }] = await Promise.all([
        maker.length === 7
          ? withFilters().like("jan", `${maker}%`).returns<Product[]>()
          : Promise.resolve({ data: [] as Product[] }),
        withFilters().returns<Product[]>(),
      ]);
      const makerIds = new Set((sameMaker ?? []).map((p) => p.id));
      setCandidates([
        ...(sameMaker ?? []).map((product) => ({ product, sameMaker: true })),
        ...(rest ?? [])
          .filter((product) => !makerIds.has(product.id))
          .map((product) => ({ product, sameMaker: false })),
      ]);
      setSearching(false);
    },
    [],
  );

  useEffect(() => {
    if (status !== "unknown") return;
    const timer = setTimeout(() => {
      void searchCandidates(unknownJan, candidateQuery, candidateCategory);
    }, 250);
    return () => clearTimeout(timer);
  }, [status, unknownJan, candidateQuery, candidateCategory, searchCandidates]);

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

    // JAN マスタに無い場合は登録済みの商品から手で選ばせる。ここで詰まらせないのが大事。
    setHit(null);
    if (code !== unknownJan) {
      setCandidates([]);
      setCandidateQuery("");
      setCandidateCategory("");
      setUnknownJan(code);
    }
    setStatus("unknown");
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
          <div className="font-bold text-amber-900">
            このバーコード（{unknownJan}）は登録がありません
          </div>
          <p className="text-sm text-amber-900">
            登録済みの商品から選んでポーチに入れてください。名前やカテゴリで絞り込めます。
          </p>
          <label className="relative mt-3 block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="search"
              value={candidateQuery}
              onChange={(e) => setCandidateQuery(e.target.value)}
              placeholder="商品名で絞り込む"
              className="w-full rounded-full border border-ink-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCandidateCategory("")}
              className={`${CHIP} ${candidateCategory === "" ? CHIP_ON : CHIP_OFF}`}
            >
              すべて
            </button>
            {CANDIDATE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCandidateCategory(category)}
                className={`${CHIP} ${candidateCategory === category ? CHIP_ON : CHIP_OFF}`}
              >
                {CATEGORY_LABEL[category]}
              </button>
            ))}
          </div>
          {!searching && candidates.length === 0 && (
            <p className="mt-3 text-sm text-amber-900">
              条件に合う商品がありません。絞り込みを変えてください。
            </p>
          )}
          <div className="mt-3 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {candidates.map(({ product: p, sameMaker }) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void register(p, "manual")}
                className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-2 text-left text-sm"
              >
                <span
                  className="swatch inline-block h-8 w-8 shrink-0 rounded-full"
                  style={{ background: p.color_hex ?? "#e9e2e6" }}
                />
                <span className="min-w-0">
                  <span className="block truncate">
                    {p.brands?.name} {p.name}
                  </span>
                  <span className="text-xs text-ink-400">
                    {CATEGORY_LABEL[p.category]} ・ ¥{p.price_yen.toLocaleString()}
                  </span>
                  {sameMaker && (
                    <span className="mt-0.5 block text-xs font-bold text-brand-600">
                      同じ事業者コード
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
