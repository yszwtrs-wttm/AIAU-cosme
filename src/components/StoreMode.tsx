"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  History,
  Loader2,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { addToStash } from "@/app/actions";
import { useBarcodeReader } from "@/lib/useBarcodeReader";
import { judgeByJan, priceGapText, VERDICT_LABEL, type StoreJudgement } from "@/lib/store";
import { CATEGORY_LABEL } from "@/lib/types";
import { colorDifferenceText, colorMatchBadge, formulaMatchBadge } from "@/lib/wording";

type HistoryEntry = StoreJudgement & { key: string; skipped: boolean };

const TONE: Record<StoreJudgement["verdict"], { sheet: string; text: string; chip: string }> = {
  owned: { sheet: "bg-brand-600", text: "text-white", chip: "bg-white/20 text-white" },
  similar: { sheet: "bg-amber-400", text: "text-ink-900", chip: "bg-ink-900/10 text-ink-900" },
  new: { sheet: "bg-emerald-600", text: "text-white", chip: "bg-white/20 text-white" },
  unknown: { sheet: "bg-ink-100", text: "text-ink-900", chip: "bg-ink-900/10 text-ink-900" },
};

/**
 * 店頭で棚の前に立ったまま使う全画面モード。
 * 片手・縦持ちで届く下半分に判定と操作を集め、読み取りから判定まで画面を移動させない。
 */
export default function StoreMode() {
  const [result, setResult] = useState<StoreJudgement | null>(null);
  const [judging, setJudging] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState("");

  const judge = async (code: string) => {
    setJudging(true);
    setMessage("");
    try {
      const judgement = await judgeByJan(code);
      setResult(judgement);
      setHistory((prev) => [
        { ...judgement, key: `${code}-${Date.now()}`, skipped: false },
        ...prev,
      ]);
    } finally {
      setJudging(false);
    }
  };

  const { videoRef, scanning, error, start, stop } = useBarcodeReader((code) => judge(code));

  const markSkipped = () => {
    setHistory((prev) => prev.map((entry, i) => (i === 0 ? { ...entry, skipped: true } : entry)));
    setResult(null);
  };

  const keep = async (productId: number) => {
    const res = await addToStash(productId, "scan");
    setMessage(res.ok ? "ポーチに入れました" : (res.error ?? "登録に失敗しました"));
    setResult(null);
  };

  const top = result?.matches[0];
  const tone = TONE[result?.verdict ?? "unknown"];
  const skippedCount = history.filter((entry) => entry.skipped).length;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink-900 text-white">
      <header className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <Link
          href="/"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
          aria-label="店頭モードを終わる"
        >
          <X size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">店頭モード</div>
          <div className="truncate text-[11px] text-white/60">
            バーコードをかざすと、その場で判定します
          </div>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen((open) => !open)}
          className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-bold"
        >
          <History size={15} /> {history.length}
          {skippedCount > 0 && <span className="text-white/60">/ 買わない {skippedCount}</span>}
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${scanning ? "" : "hidden"}`}
        />
        {scanning && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-28 w-64 rounded-2xl border-2 border-white/80" />
          </div>
        )}
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-white/70">
              カメラを開いて、気になった商品のバーコードをかざしてください。
            </p>
            <button
              type="button"
              onClick={() => void start()}
              className="flex items-center gap-2 rounded-full bg-brand-600 px-6 py-4 text-base font-bold"
            >
              <Camera size={18} /> カメラを開く
            </button>
            {error && <p className="text-xs text-brand-200">{error}</p>}
          </div>
        )}
        {judging && (
          <div className="absolute inset-x-0 top-3 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs">
              <Loader2 size={14} className="animate-spin" /> 判定中
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        {message && <p className="text-center text-xs text-white/70">{message}</p>}

        {result ? (
          <div className={`rounded-3xl p-4 ${tone.sheet} ${tone.text}`}>
            <div className="font-display text-3xl font-bold leading-tight">
              {VERDICT_LABEL[result.verdict]}
            </div>

            {result.product ? (
              <div className="mt-1 text-sm font-bold">
                {result.product.brands?.name} {result.product.name}
                <span className="ml-2 font-normal tabular-nums opacity-80">
                  ¥{result.product.price_yen.toLocaleString()}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm">
                バーコード {result.code} は登録がありません。名前で探してみてください。
              </p>
            )}

            {result.verdict === "similar" && top && (
              <div className="mt-2 space-y-1 text-sm">
                <div className="font-bold">手持ち：{top.name}</div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className={`rounded-full px-2 py-0.5 ${tone.chip}`}>
                    {formulaMatchBadge(top.ing_sim)}
                  </span>
                  {top.delta_e !== null && (
                    <span className={`rounded-full px-2 py-0.5 ${tone.chip}`}>
                      {colorMatchBadge(top.delta_e)}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 tabular-nums ${tone.chip}`}>
                    {priceGapText(top)}
                  </span>
                </div>
                {top.color_hex && result.product?.color_hex && (
                  <div className="text-[13px]">
                    手持ちより{colorDifferenceText(top.color_hex, result.product.color_hex)}
                  </div>
                )}
              </div>
            )}

            {result.verdict === "owned" && (
              <p className="mt-1 text-sm">すでにポーチに入っています。買わなくて大丈夫です。</p>
            )}
            {result.verdict === "new" && (
              <p className="mt-1 text-sm">似た手持ちは見つかりませんでした。</p>
            )}

            {result.matches.length > 0 && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-[13px] font-bold opacity-80">
                  似ている手持ちを全部見る（{result.matches.length}点）
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {result.matches.map((row) => (
                    <li key={row.product_id} className="flex items-center gap-2 text-[13px]">
                      <span
                        className="swatch h-7 w-7 shrink-0 rounded-full"
                        style={{ background: row.color_hex ?? "#e9e2e6" }}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {row.brand} {row.name}
                      </span>
                      <span className="shrink-0 tabular-nums opacity-80">
                        ¥{row.price_yen.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {result.product && (
              <Link
                href={`/products/${result.product.id}`}
                className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold underline"
              >
                この{CATEGORY_LABEL[result.product.category]}の詳細を見る <ChevronRight size={14} />
              </Link>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={markSkipped}
                className="flex-1 rounded-full bg-ink-900 px-4 py-3.5 text-sm font-bold text-white"
              >
                買わない
              </button>
              {result.product && result.verdict !== "owned" && (
                <button
                  type="button"
                  onClick={() => void keep(result.product!.id)}
                  className="flex items-center gap-1.5 rounded-full bg-white px-4 py-3.5 text-sm font-bold text-ink-900"
                >
                  <ShoppingBag size={15} /> 買う
                </button>
              )}
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-full bg-white/25 px-4 py-3.5 text-sm font-bold"
              >
                次をかざす
              </button>
            </div>
          </div>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!manual) return;
              void judge(manual);
              setManual("");
            }}
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              inputMode="numeric"
              placeholder="読み取れないときは数字を入力"
              className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/50"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-4 py-3 text-sm font-bold"
            >
              <Search size={15} /> 判定
            </button>
          </form>
        )}

        {scanning && !result && (
          <button
            type="button"
            onClick={stop}
            className="w-full rounded-full bg-white/10 py-2 text-xs text-white/70"
          >
            カメラを閉じる
          </button>
        )}
      </div>

      {historyOpen && (
        <div className="absolute inset-0 z-50 flex flex-col bg-ink-900/95 backdrop-blur">
          <header className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
            <div className="flex-1 text-sm font-bold">判定履歴（{history.length}件）</div>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
              aria-label="判定履歴を閉じる"
            >
              <X size={18} />
            </button>
          </header>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {history.length === 0 && (
              <li className="text-sm text-white/60">まだ読み取っていません。</li>
            )}
            {history.map((entry, i) => (
              <li key={entry.key} className="flex items-center gap-2 rounded-2xl bg-white/10 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {entry.product
                      ? `${entry.product.brands?.name ?? ""} ${entry.product.name}`
                      : `バーコード ${entry.code}`}
                  </div>
                  <div className="text-[11px] text-white/60">{VERDICT_LABEL[entry.verdict]}</div>
                </div>
                {entry.skipped ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-200">
                    <Check size={13} /> 買わない
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setHistory((prev) =>
                        prev.map((row, j) => (i === j ? { ...row, skipped: true } : row)),
                      )
                    }
                    className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold"
                  >
                    買わない
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
