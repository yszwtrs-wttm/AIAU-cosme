import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** メールのリンクから戻ってきたコードをセッションに交換する。 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams } = url;
  // リクエストのホスト（127.0.0.1 など）を保たないと、Cookie を置いたホストと別のホストへ戻してしまう。
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) url.host = host;
  const { origin } = url;
  const code = searchParams.get("code");
  const isRecovery = searchParams.get("type") === "recovery";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("認証リンクが無効です")}`,
    );
  }

  const supabase = await createClient();
  const { data: session, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !session.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("認証リンクを確認できませんでした")}`,
    );
  }

  // プロフィールは誰でも読めるので、自分の分だけに絞らないと遷移先を決められない。
  const { data } = await supabase
    .from("profiles")
    .select("handle")
    .eq("user_id", session.user.id)
    .maybeSingle();
  return NextResponse.redirect(`${origin}${isRecovery || !data ? "/settings" : "/me"}`);
}
