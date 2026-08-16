"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Camera, List, Plus, X } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import QuickStartPicker from "@/components/QuickStartPicker";
import type { Product } from "@/lib/types";

type Tab = "list" | "scan";

const TAB = "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition";
const TAB_ON = "bg-ink-900 text-white";
const TAB_OFF = "text-ink-600";

/**
 * ポーチへの追加をダイアログにまとめる。一覧の下に登録フォームを並べると
 * 「登録している商品」が読みにくくなるので、追加は明示的に開いてもらう。
 */
export default function AddToStashDialog({ popular }: { popular: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("list");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
      >
        <Plus size={16} /> 商品を追加
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ポーチに商品を追加"
          onClick={close}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white sm:max-w-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <h2 className="font-display text-lg font-bold">ポーチに商品を追加</h2>
              <button
                type="button"
                aria-label="閉じる"
                onClick={close}
                className="rounded-full border border-ink-200 p-2 text-ink-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pt-4">
              <div className="flex gap-1 rounded-full bg-ink-100 p-1">
                <button
                  type="button"
                  onClick={() => setTab("list")}
                  className={`${TAB} ${tab === "list" ? TAB_ON : TAB_OFF}`}
                >
                  <List size={15} /> リストから選ぶ
                </button>
                <button
                  type="button"
                  onClick={() => setTab("scan")}
                  className={`${TAB} ${tab === "scan" ? TAB_ON : TAB_OFF}`}
                >
                  <Camera size={15} /> バーコード
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {tab === "list" ? (
                <QuickStartPicker products={popular} onDone={close} />
              ) : (
                <BarcodeScanner onDone={close} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
