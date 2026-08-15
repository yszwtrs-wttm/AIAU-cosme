import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3000);
// supabase/config.toml の site_url と同じホストにしないと、認証メールのリンクから戻れない。
const baseURL = `http://127.0.0.1:${port}`;

/**
 * デモ導線（未ログイン閲覧 / 新規登録 / プロフィール作成 / ポーチ登録 / 被り判定 / 口コミ投稿）を守るための設定。
 * ローカルの Supabase（`npx supabase start` + `npm run db:reset`）に対して実行する。
 */
export default defineConfig({
  testDir: "./e2e",
  // 同じデータベースを共有し、口コミの投稿制限もあるので直列に流す。
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    locale: "ja-JP",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI
      ? `npx next start --port ${port}`
      : `npx next dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
