"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";
type Step = "email" | "sent";

function toJapaneseError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  if (message.includes("invalid login credentials")) {
    return "メールアドレスかパスワードが違います";
  }
  if (
    message.includes("password") &&
    (message.includes("8") ||
      message.includes("characters") ||
      message.includes("length") ||
      message.includes("short"))
  ) {
    return "パスワードは8文字以上にしてください";
  }
  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("email rate limit exceeded")
  ) {
    return "メール送信が制限されています。しばらく待ってからもう一度お試しください";
  }
  return "認証に失敗しました。入力内容を確認して、もう一度お試しください";
}

export default function LoginForm({
  anonymous,
  initialMode,
}: {
  anonymous: boolean;
  initialMode: AuthMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<Step>("email");
  const [resetPassword, setResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // プロフィールは誰でも読めるので、自分の分だけに絞らないと遷移先を決められない。
  const finishAuth = async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("handle")
      .eq("user_id", userId)
      .maybeSingle();
    router.push(data ? "/me" : "/settings");
    router.refresh();
  };

  const sendEmail = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("メールアドレスを入力してください");
      return;
    }
    if (mode === "login" && !resetPassword && password.length === 0) {
      setError("パスワードを入力してください");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback`;

    if (mode === "login" && !resetPassword) {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (err || !data.user) {
        setBusy(false);
        setError(toJapaneseError(err));
        return;
      }
      await finishAuth(data.user.id);
      setBusy(false);
      return;
    }

    const { error: err } = resetPassword
      ? await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${emailRedirectTo}?type=recovery`,
        })
      : mode === "signup" && anonymous
        ? await supabase.auth.updateUser(
            { email: normalizedEmail },
            { emailRedirectTo },
          )
        : await supabase.auth.signInWithOtp({
            email: normalizedEmail,
            options: {
              shouldCreateUser: mode === "signup",
              emailRedirectTo,
            },
          });

    setBusy(false);
    if (err) {
      setError(toJapaneseError(err));
      return;
    }
    setEmail(normalizedEmail);
    setStep("sent");
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setResetPassword(false);
    setStep("email");
    setPassword("");
    setError(null);
  };

  const startPasswordReset = () => {
    setResetPassword(true);
    setStep("email");
    setPassword("");
    setError(null);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
      <div>
        <h2 className="font-display text-xl font-bold">
          {mode === "signup" ? "新規登録" : resetPassword ? "パスワードを再設定" : "ログイン"}
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          {step === "email" && mode === "signup" && "メールアドレスに確認リンクを送ります。"}
          {step === "email" && mode === "login" && !resetPassword && "登録済みのメールアドレスとパスワードでログインします。"}
          {step === "email" && resetPassword && "登録済みのメールアドレスに再設定リンクを送ります。"}
          {step === "sent" && "メールに届いたリンクを開いてください。"}
        </p>
      </div>

      {step === "email" && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendEmail();
          }}
        >
          <label className="block text-sm font-bold" htmlFor="login-email">
            メールアドレス
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          />

          {mode === "login" && !resetPassword && (
            <>
              <label className="block text-sm font-bold" htmlFor="login-password">
                パスワード
              </label>
              <PasswordField
                id="login-password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
            </>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {mode === "login" && !resetPassword ? (
              <>
                <LockKeyhole size={15} /> {busy ? "ログイン中…" : "ログインする"}
              </>
            ) : (
              <>
                <Mail size={15} /> {busy ? "送信中…" : "メールを送る"}
              </>
            )}
          </button>

          {mode === "login" && !resetPassword && (
            <button
              type="button"
              onClick={startPasswordReset}
              className="w-full text-xs text-brand-600 underline"
            >
              パスワードを忘れた場合・まだ設定していない場合
            </button>
          )}
          {resetPassword && (
            <button
              type="button"
              onClick={() => {
                setResetPassword(false);
                setError(null);
              }}
              className="w-full text-xs text-ink-400 underline"
            >
              ログインに戻る
            </button>
          )}
        </form>
      )}

      {step === "sent" && (
        <div className="space-y-3 rounded-2xl bg-brand-50 p-4 text-sm">
          <p>
            <span className="font-bold">{email}</span> にメールを送りました。
          </p>
          <p className="text-ink-600">
            メールに届いたリンクを開くと、{resetPassword ? "パスワードの設定画面" : "認証とプロフィール作成画面"}に進みます。
          </p>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="text-xs text-ink-400 underline"
          >
            メールアドレスを直す
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {step === "email" && !resetPassword && (
        <button
          type="button"
          onClick={() => switchMode(mode === "login" ? "signup" : "login")}
          className="w-full text-xs text-brand-600 underline"
        >
          {mode === "login" ? "新規登録はこちら" : "ログインはこちら"}
        </button>
      )}
    </div>
  );
}
