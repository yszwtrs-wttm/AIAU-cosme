/**
 * Server Action や Supabase が返すメッセージは英語なので、よくある失敗だけ日本語にする。
 * 当てはまらないものは元の文言を残す（原因を隠すと調べられなくなる）。
 */
const PATTERNS: [RegExp, string][] = [
  [/row-level security|permission denied|not authorized|jwt/i, "権限がありません。ログインし直してください"],
  [/duplicate key|already exists|conflict/i, "すでに登録されています"],
  [/failed to fetch|network|econnrefused|timeout|aborted/i, "通信できませんでした。電波の良い場所でもう一度お試しください"],
  [/violates foreign key|not found|does not exist/i, "対象が見つかりませんでした"],
];

export function japaneseError(error: unknown, fallback: string): string {
  const raw =
    typeof error === "string" ? error : error instanceof Error ? error.message : "";
  if (!raw) return fallback;
  for (const [pattern, message] of PATTERNS) {
    if (pattern.test(raw)) return message;
  }
  return raw;
}
