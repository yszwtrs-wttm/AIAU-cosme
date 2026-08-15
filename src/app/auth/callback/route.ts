import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toJapaneseOAuthError(code: string | null, description: string | null) {
  const detail = `${code ?? ""} ${description ?? ""}`.toLowerCase();

  if (detail.includes("identity_already_exists") || detail.includes("already linked")) {
    return "そのアカウントはすでに別のユーザーに紐付いています。お試し利用をやめてそのままログインしてください";
  }
  if (detail.includes("provider is not enabled") || detail.includes("validation_failed")) {
    return "このログイン方法は現在利用できません";
  }
  if (detail.includes("access_denied")) {
    return "ログインがキャンセルされました";
  }
  return "認証に失敗しました。もう一度お試しください";
}

/** メールのリンク・OAuth から戻ってきたコードをセッションに交換する。 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const isRecovery = searchParams.get("type") === "recovery";
  const errorCode = searchParams.get("error") ?? searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (errorCode || errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(toJapaneseOAuthError(errorCode, errorDescription))}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("認証リンクが無効です")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("認証リンクを確認できませんでした")}`,
    );
  }

  const { data } = await supabase.from("profiles").select("handle").maybeSingle();
  return NextResponse.redirect(`${origin}${isRecovery || !data ? "/settings" : "/me"}`);
}
