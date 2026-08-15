"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

/**
 * メールに届く 6 桁コードでログインする。
 * お試し（匿名）で使っていた場合は、そのユーザーにメールを紐づけて
 * ポーチの中身を引き継ぐ（新しいユーザーを作らない）。
 */
export default function LoginForm({ anonymous }: { anonymous: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error: err } = anonymous
      ? await supabase.auth.updateUser({ email })
      : await supabase.auth.signInWithOtp({ email });

    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setLinking(anonymous);
    setStep("code");
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: linking ? "email_change" : "email",
    });

    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }

    const { data } = await supabase.from("profiles").select("handle").maybeSingle();
    router.push(data ? "/me" : "/settings");
    router.refresh();
  };

  const signInWithGoogle = async () => {
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) setError(err.message);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
      {step === "email" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.includes("@")) void sendCode();
          }}
        >
          <label className="block text-sm font-bold">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <Mail size={15} /> {busy ? "送信中…" : "確認コードを送る"}
          </button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length >= 6) void verify();
          }}
        >
          <p className="text-sm">
            {email} に届いた6桁のコードを入力してください。
          </p>
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-full rounded-2xl border border-brand-100 px-3 py-2.5 text-center text-lg tracking-widest outline-none focus:border-brand-300"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "確認中…" : "ログインする"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full text-xs text-ink-400 underline"
          >
            メールアドレスを直す
          </button>
        </form>
      )}

      <div className="flex items-center gap-2 text-[11px] text-ink-400">
        <span className="h-px flex-1 bg-brand-100" />
        または
        <span className="h-px flex-1 bg-brand-100" />
      </div>

      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="w-full rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-900"
      >
        Google で続ける
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
