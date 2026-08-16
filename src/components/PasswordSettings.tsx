"use client";

import { useState } from "react";
import PasswordField from "@/components/PasswordField";
import { createClient } from "@/lib/supabase/client";

export default function PasswordSettings({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(!hasPassword);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください");
      return;
    }
    if (password !== confirmation) {
      setError("パスワードが一致しません");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({
      password,
      data: { has_password: true },
    });
    setBusy(false);
    if (err) {
      const text = err.message.toLowerCase();
      setError(
        text.includes("password") &&
          (text.includes("8") || text.includes("character") || text.includes("short"))
          ? "パスワードは8文字以上にしてください"
          : "パスワードを設定できませんでした。もう一度お試しください",
      );
      return;
    }
    setPassword("");
    setConfirmation("");
    setMessage("パスワードを設定しました");
    setOpen(false);
  };

  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50 p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold">
            {hasPassword ? "パスワードを変更する" : "パスワードを設定"}
          </span>
          {!hasPassword && (
            <span className="mt-1 block text-xs text-ink-600">
              次回からメールアドレスとパスワードでログインできます。
            </span>
          )}
        </span>
        <span className="text-xs text-brand-700">{open ? "閉じる" : "開く"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-bold">パスワード</span>
            <PasswordField
              id="settings-password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-bold">パスワード（確認）</span>
            <PasswordField
              id="settings-password-confirmation"
              value={confirmation}
              onChange={setConfirmation}
              autoComplete="new-password"
            />
          </label>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-ink-0 disabled:opacity-50"
          >
            {busy ? "設定中…" : hasPassword ? "変更する" : "パスワードを設定する"}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {message && <p className="text-xs text-emerald-600">{message}</p>}
        </div>
      )}
      {!open && message && <p className="mt-2 text-xs text-emerald-600">{message}</p>}
    </section>
  );
}
