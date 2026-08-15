export type SocialProvider = "google" | "apple";

export const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: "Google",
  apple: "Apple",
};

const ALL: SocialProvider[] = ["google", "apple"];

/**
 * Supabase Auth 側で有効にしたプロバイダだけをログイン画面に出す。
 * `NEXT_PUBLIC_OAUTH_PROVIDERS="google,apple"` のように指定し、未設定なら何も出さない。
 */
export function enabledSocialProviders(): SocialProvider[] {
  const raw = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "";
  const requested = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return ALL.filter((provider) => requested.includes(provider));
}
