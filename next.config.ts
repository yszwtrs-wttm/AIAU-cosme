import { withSentryConfig } from "@sentry/nextjs";
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

/**
 * Sentry の組織情報とトークンが揃っているときだけソースマップを送る。
 * 揃っていない環境（ローカル・フォークからのビルド）では素の設定でビルドする。
 */
const { SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN } = process.env;

export default SENTRY_ORG && SENTRY_PROJECT && SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: SENTRY_ORG,
      project: SENTRY_PROJECT,
      authToken: SENTRY_AUTH_TOKEN,
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
