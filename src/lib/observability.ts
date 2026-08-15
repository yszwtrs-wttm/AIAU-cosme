/**
 * 例外とパフォーマンス指標の送り先をここに集める。
 * Sentry の DSN が設定されていれば Sentry に、無ければ標準出力に JSON で出す
 * （Vercel の Runtime Logs / Observability から検索できる）。
 */
type Context = Record<string, string | number | boolean | null | undefined>;

export function captureError(where: string, error: unknown, context: Context = {}): void {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    void import("@sentry/nextjs").then((Sentry) =>
      Sentry.captureException(error, { tags: { where }, extra: context }),
    );
  }

  console.error(
    JSON.stringify({
      level: "error",
      where,
      message: error instanceof Error ? error.message : String(error),
      ...context,
    }),
  );
}

export function captureMetric(name: string, value: number, context: Context = {}): void {
  console.log(JSON.stringify({ level: "info", metric: name, value, ...context }));
}

/**
 * Supabase / Postgres のエラーはテーブル名や制約名が出るので、そのまま UI に出さない。
 * ログには元の内容を送り、画面には短い日本語だけを返す。
 */
export function userMessage(
  error: { code?: string; message?: string } | null | undefined,
  conflictMessage = "すでに登録されています",
): string {
  // トリガーが raise exception で出している日本語（投稿上限など）はそのまま見せる。
  if (error?.code === "P0001" && error.message) return error.message;

  switch (error?.code) {
    case "23505":
      return conflictMessage;
    case "23503":
    case "23514":
    case "22P02":
      return "入力内容を確認してください";
    case "42501":
      return "この操作をする権限がありません";
    case "PGRST301":
      return "ログインの有効期限が切れました。もう一度ログインしてください";
    default:
      return "保存できませんでした。時間をおいて試してください";
  }
}

/** Supabase のエラーをログに送り、UI 用の短い日本語だけを返す。 */
export function reportSupabaseError(
  where: string,
  error: { code?: string; message?: string; details?: string } | null | undefined,
  context: Context = {},
  conflictMessage?: string,
): string {
  captureError(where, new Error(error?.message ?? "supabase error"), {
    code: error?.code,
    details: error?.details,
    ...context,
  });
  return userMessage(error, conflictMessage);
}
