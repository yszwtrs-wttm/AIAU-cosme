import type { NextConfig } from "next";

/**
 * 画像は Supabase Storage の公開バケット（review-images / avatars）にしかない。
 * next/image で最適化させるため、接続先のホストだけを許可する。
 */
function supabaseImagePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  const { protocol, hostname, port } = new URL(url);
  return [
    {
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      port,
      pathname: "/storage/v1/object/public/**",
    },
  ];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImagePatterns(),
  },
  experimental: {
    /**
     * すべてのページが Cookie（ログイン状態）を読むので動的レンダリングになり、
     * 既定では一度見たページに戻るたびに再取得が走る。短時間の使い回しを許して
     * タブの行き来と戻るを待ち時間なしにする。
     */
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
