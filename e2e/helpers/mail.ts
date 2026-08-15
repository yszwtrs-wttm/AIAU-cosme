import { MAIL_URL } from "./env";

type MailSummary = {
  ID: string;
  Created: string;
  To: { Address: string }[];
};

type MailBody = { HTML: string; Text: string };

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} に接続できませんでした（${res.status}）`);
  return (await res.json()) as T;
}

/** 宛先に届いた最新のメールを待つ。 */
async function waitForLatestMail(address: string, timeoutMs: number): Promise<MailBody> {
  const deadline = Date.now() + timeoutMs;
  const query = encodeURIComponent(`to:${address}`);

  while (Date.now() < deadline) {
    const { messages } = await json<{ messages: MailSummary[] }>(
      `${MAIL_URL}/api/v1/search?query=${query}`,
    );
    const mine = messages
      .filter((message) => message.To.some((to) => to.Address === address))
      .sort((a, b) => Date.parse(b.Created) - Date.parse(a.Created));

    if (mine[0]) return json<MailBody>(`${MAIL_URL}/api/v1/message/${mine[0].ID}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`${address} 宛のメールが届きませんでした`);
}

/** 認証メールの中のリンク（`/auth/v1/verify?...`）を取り出す。 */
export async function waitForAuthLink(address: string, timeoutMs = 30_000): Promise<string> {
  const mail = await waitForLatestMail(address, timeoutMs);
  const source = `${mail.HTML}\n${mail.Text}`;
  const match = source.match(/https?:\/\/[^\s"'<>]*\/auth\/v1\/verify\?[^\s"'<>]+/);
  if (!match) throw new Error(`認証リンクが見つかりませんでした: ${source.slice(0, 300)}`);
  return match[0].replace(/&amp;/g, "&");
}
