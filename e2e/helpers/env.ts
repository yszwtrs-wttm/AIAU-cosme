import { readFileSync } from "node:fs";
import path from "node:path";

/** `.env.local` は Next.js が読むが、テストプロセスには入らないので同じ値をここでも読む。 */
function fromEnvLocal(key: string): string | undefined {
  try {
    const text = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const [name, ...rest] = line.split("=");
      if (name?.trim() === key) return rest.join("=").trim();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function required(key: string): string {
  const value = process.env[key] ?? fromEnvLocal(key);
  if (!value) {
    throw new Error(
      `${key} が設定されていません。npx supabase start のあと .env.local に入れてください。`,
    );
  }
  return value;
}

export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
/** ローカルのメール受信箱（supabase start が立てる Mailpit）。 */
export const MAIL_URL = process.env.E2E_MAIL_URL ?? "http://127.0.0.1:54324";
