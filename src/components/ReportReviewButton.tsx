"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag, Undo2 } from "lucide-react";
import { reportReview, undoReportReview } from "@/app/actions";
import { REPORT_REASON_LABEL, type ReportReason } from "@/lib/types";

/** 送信直後に「取り消す」を強調しておく秒数。過ぎても取り消し自体はできる。 */
const UNDO_SECONDS = 15;

const REASONS = Object.keys(REPORT_REASON_LABEL) as ReportReason[];

export default function ReportReviewButton({
  reviewId,
  canReport,
  alreadyReported = false,
}: {
  reviewId: number;
  canReport: boolean;
  alreadyReported?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("ad");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(alreadyReported);
  const [undoLeft, setUndoLeft] = useState(0);

  useEffect(() => {
    setReported(alreadyReported);
  }, [alreadyReported]);

  useEffect(() => {
    if (undoLeft <= 0) return;
    const timer = setTimeout(() => setUndoLeft(undoLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [undoLeft]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async () => {
    setBusy(true);
    setError(null);
    const res = await reportReview(reviewId, reason);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "報告できませんでした");
      return;
    }

    setOpen(false);
    setReported(true);
    setUndoLeft(UNDO_SECONDS);
  };

  const undo = async () => {
    setBusy(true);
    const res = await undoReportReview(reviewId);
    setBusy(false);
    if (!res.ok) return;
    setReported(false);
    setUndoLeft(0);
  };

  if (reported) {
    return (
      <div className="flex shrink-0 items-center gap-2 text-[11px] text-ink-400">
        <span>報告しました</span>
        <button
          type="button"
          onClick={undo}
          disabled={busy}
          className="flex items-center gap-1 rounded-full border border-ink-200 px-2 py-0.5 font-bold text-brand-600 disabled:opacity-50"
        >
          <Undo2 size={11} /> 取り消す{undoLeft > 0 ? `（${undoLeft}）` : ""}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="flex shrink-0 items-center gap-1 text-[11px] text-ink-400 hover:text-brand-600"
      >
        <Flag size={12} /> 報告
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="この口コミを報告する"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-4 text-left shadow-pop"
          >
            <div className="text-sm font-bold">この口コミを報告する</div>

            {canReport ? (
              <>
                <p className="text-[11px] text-ink-400">
                  報告が3件になると、この口コミは総合評価から外れます（表示は残ります）。
                </p>

                <div className="space-y-1">
                  {REASONS.map((key) => (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                        reason === key
                          ? "border-brand-300 bg-brand-50 font-bold text-brand-700"
                          : "border-ink-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`report-reason-${reviewId}`}
                        value={key}
                        checked={reason === key}
                        onChange={() => setReason(key)}
                        className="accent-brand-600"
                      />
                      {REPORT_REASON_LABEL[key]}
                    </label>
                  ))}
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600"
                  >
                    やめる
                  </button>
                  <button
                    type="button"
                    onClick={send}
                    disabled={busy}
                    className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {busy ? "送信中…" : "この理由で報告する"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-ink-600">報告にはログインが必要です。</p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600"
                  >
                    やめる
                  </button>
                  <Link
                    href="/login"
                    className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    ログイン
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
