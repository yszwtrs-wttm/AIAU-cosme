"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";
type Step = "email" | "code" | "password";

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
    return "確認コードの送信が制限されています。しばらく待ってからもう一度お試しください";
  }
  if (message.includes("otp") || message.includes("token")) {
    return "確認コードが正しくないか、有効期限が切れています。もう一度お試しください";
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
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const finishAuth = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("handle").maybeSingle();
    router.push(data ? "/me" : "/settings");
    router.refresh();
  };

  const sendCode = async () => {
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

    if (mode === "login" && !resetPassword) {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (err) {
        setBusy(false);
        setError(toJapaneseError(err));
        return;
      }
      await finishAuth();
      setBusy(false);
      return;
    }

    const shouldLinkAnonymous = mode === "signup" && anonymous;
    const { error: err } = shouldLinkAnonymous
      ? await supabase.auth.updateUser({ email: normalizedEmail })
      : await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: { shouldCreateUser: mode === "signup" },
        });

    setBusy(false);
    if (err) {
      setError(toJapaneseError(err));
      return;
    }
    setEmail(normalizedEmail);
    setLinking(shouldLinkAnonymous);
    setStep("code");
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError("6桁の確認コードを入力してください");
      return;
    }

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
      setError(toJapaneseError(err));
      return;
    }
    setStep("password");
  };

  const updatePassword = async () => {
    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("パスワードが一致しません");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setBusy(false);
      setError(toJapaneseError(err));
      return;
    }
    await finishAuth();
    setBusy(false);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setResetPassword(false);
    setStep("email");
    setPassword("");
    setPasswordConfirmation("");
    setCode("");
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
          {step === "email" && mode === "signup" && "メールアドレスに届く6桁のコードで確認します。"}
          {step === "email" && mode === "login" && !resetPassword && "登録済みのメールアドレスとパスワードでログインします。"}
          {step === "email" && resetPassword && "登録済みのメールアドレスに確認コードを送ります。"}
          {step === "code" && "メールアドレスに届いた6桁のコードを入力してください。"}
          {step === "password" && "パスワードを8文字以上で設定してください。"}
        </p>
      </div>

      {step === "email" && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
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
              <PasswordInput
                id="login-password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                show={showPassword}
                onToggle={() => setShowPassword((visible) => !visible)}
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
                <Mail size={15} /> {busy ? "送信中…" : "確認コードを送る"}
              </>
            )}
          </button>

          {mode === "login" && !resetPassword && (
            <button
              type="button"
              onClick={startPasswordReset}
              className="w-full text-xs text-brand-600 underline"
            >
              パスワードを忘れた場合
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

      {step === "code" && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void verifyCode();
          }}
        >
          <p className="text-sm">{email} に届いた6桁のコードを入力してください。</p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
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
            {busy ? "確認中…" : "コードを確認する"}
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

      {step === "password" && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void updatePassword();
          }}
        >
          <label className="block text-sm font-bold" htmlFor="new-password">
            パスワード
          </label>
          <PasswordInput
            id="new-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            show={showPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
          <label className="block text-sm font-bold" htmlFor="new-password-confirmation">
            パスワード（確認）
          </label>
          <PasswordInput
            id="new-password-confirmation"
            value={passwordConfirmation}
            onChange={setPasswordConfirmation}
            autoComplete="new-password"
            show={showPasswordConfirmation}
            onToggle={() => setShowPasswordConfirmation((visible) => !visible)}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "設定中…" : "パスワードを設定する"}
          </button>
        </form>
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

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  show,
  onToggle,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-brand-100 px-3 py-2.5 pr-11 text-sm outline-none focus:border-brand-300"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "パスワードを隠す" : "パスワードを表示"}
        className="absolute inset-y-0 right-3 text-ink-400"
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
