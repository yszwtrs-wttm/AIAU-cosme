"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@/lib/oauth";

function ProviderMark({ provider }: { provider: SocialProvider }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A8.99 8.99 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.94H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.34z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.53c.02-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.96-1.53-.12-2.82.89-3.55.89-.74 0-1.95-.87-3.2-.85-1.65.03-3.16.96-4.01 2.43-1.71 2.97-.44 7.36 1.23 9.77.82 1.17 1.79 2.42 3.07 2.37 1.23-.05 1.7-.79 3.19-.79 1.48 0 1.9.79 3.2.77 1.32-.02 2.17-1.2 2.98-2.38.94-1.36 1.33-2.68 1.35-2.75-.03-.01-2.6-1-2.78-3.73zM14.7 4.9c.67-.82.62-1.94.6-2.13-.87.04-1.87.58-2.45 1.29-.53.63-.68 1.68-.63 2.05.92.07 1.81-.4 2.48-1.21z" />
    </svg>
  );
}

/**
 * メールを開かずにログインできる導線。
 * 匿名セッションのときは linkIdentity で同じユーザーに紐付け、ポーチをそのまま引き継ぐ。
 */
export default function SocialAuthButtons({
  providers,
  anonymous,
}: {
  providers: SocialProvider[];
  anonymous: boolean;
}) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  const start = async (provider: SocialProvider) => {
    setBusy(provider);
    setError(null);

    const supabase = createClient();
    const options = { redirectTo: `${window.location.origin}/auth/callback` };

    if (anonymous) {
      const { error: linkError } = await supabase.auth.linkIdentity({ provider, options });
      if (!linkError) return;
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({ provider, options });
    if (signInError) {
      setBusy(null);
      setError(`${SOCIAL_PROVIDER_LABELS[provider]} でのログインを開始できませんでした`);
    }
  };

  return (
    <div className="space-y-2">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => void start(provider)}
          disabled={busy !== null}
          className={
            provider === "apple"
              ? "flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              : "flex w-full items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-900 disabled:opacity-50"
          }
        >
          <ProviderMark provider={provider} />
          {busy === provider
            ? "移動中…"
            : `${SOCIAL_PROVIDER_LABELS[provider]} でつづける`}
        </button>
      ))}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2 pt-1 text-xs text-ink-400">
        <span className="h-px flex-1 bg-ink-200" />
        または
        <span className="h-px flex-1 bg-ink-200" />
      </div>
    </div>
  );
}
