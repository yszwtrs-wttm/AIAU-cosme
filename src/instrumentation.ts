import type { Instrumentation } from "next";
import { captureError } from "@/lib/observability";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Edge（middleware）でやっているのはトークン更新だけなので、SDK は Node ランタイムだけに入れる。
const enabled = Boolean(dsn) && process.env.NEXT_RUNTIME === "nodejs";

export async function register(): Promise<void> {
  // DSN が無い環境（ローカル・プレビュー）では SDK を読み込まない。
  if (!enabled) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  });
}

/** Server Component / Route Handler / Server Action の例外を Sentry に送る。 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  captureError("request", error, { path: request.path, routeType: context.routeType });
  if (!enabled) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  await captureRequestError(error, request, context);
};
