import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** メールのリンクから戻ってきたコードをセッションに交換する。 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
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

  const { data } = await supabase
    .from("profiles")
    .select("handle")
    .eq("user_id", session.user.id)
    .maybeSingle();
  return NextResponse.redirect(`${origin}${isRecovery || !data ? "/settings" : "/me"}`);
}
