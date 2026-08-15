import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** 有効期限までこれ以上あるアクセストークンは、まだ更新しなくてよい。 */
const REFRESH_MARGIN_SEC = 120;

/**
 * Cookie のセッションが十分先まで有効かを、Auth サーバーに問い合わせずに判定する。
 * 判定できない形なら false を返して通常の更新に任せる。
 */
function sessionIsFresh(request: NextRequest): boolean {
  const chunks = request.cookies
    .getAll()
    .filter(({ name }) => /^sb-.+-auth-token(\.\d+)?$/.test(name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (chunks.length === 0) return false;

  const raw = chunks.map(({ value }) => value).join("");
  try {
    const json = raw.startsWith("base64-")
      ? new TextDecoder().decode(
          Uint8Array.from(atob(raw.slice("base64-".length)), (c) => c.charCodeAt(0)),
        )
      : decodeURIComponent(raw);
    const expiresAt = (JSON.parse(json) as { expires_at?: number }).expires_at;
    if (typeof expiresAt !== "number") return false;
    return expiresAt - Date.now() / 1000 > REFRESH_MARGIN_SEC;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // ここでの役割はトークンの更新だけなので、まだ有効なら往復を省いてページ遷移を待たせない。
  if (sessionIsFresh(request)) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // クローラーが読む robots.txt / sitemap.xml はセッションを持たないので通さない。
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
