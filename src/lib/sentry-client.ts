/**
 * Sentry のブラウザ SDK は 80kB ほどあり、初期表示に効いてしまう。
 * DSN が設定されている環境でだけ動的に読み込み、それ以外では読み込まない。
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

type SentryClient = typeof import("@sentry/nextjs");

let loading: Promise<SentryClient | null> | null = null;

export function loadSentry(): Promise<SentryClient | null> {
  if (!dsn) return Promise.resolve(null);
  loading ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
      tracesSampleRate: 0.1,
      // 端末を特定できる情報は送らない。
      sendDefaultPii: false,
    });
    return Sentry;
  });
  return loading;
}

export function captureClientError(error: unknown, context: Record<string, string | undefined> = {}): void {
  console.error(
    JSON.stringify({
      level: "error",
      message: error instanceof Error ? error.message : String(error),
      ...context,
    }),
  );
  void loadSentry().then((Sentry) => Sentry?.captureException(error, { extra: context }));
}
