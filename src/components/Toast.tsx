"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

type Tone = "error" | "success";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

/**
 * Server Action の `{ ok, error }` を画面に出すための最小のトースト。
 * 失敗理由を捨てずに、押した場所の近く（画面下）で日本語のまま見せる。
 */
export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast は ToastProvider の中でだけ使えます");
  return showToast;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: Tone = "error") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 2600);
    },
    [dismiss],
  );

  const value = useMemo(() => showToast, [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.tone === "error" ? "bg-red-600 text-ink-0" : "bg-ink-900 text-ink-0"
            }`}
          >
            {toast.tone === "error" ? (
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
            ) : (
              <CircleCheck size={16} className="mt-0.5 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="閉じる"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
