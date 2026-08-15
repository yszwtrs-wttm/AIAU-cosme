import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
