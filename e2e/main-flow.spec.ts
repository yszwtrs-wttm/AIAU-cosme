import { expect, test, type Page } from "@playwright/test";
import { findDupePair, type DupePair } from "./helpers/db";
import { waitForAuthLink } from "./helpers/mail";

/** 登録したアカウントを次のテストでも使うので、直列で1つのページを使い回す。 */
test.describe.configure({ mode: "serial" });

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("デモ導線", () => {
  const stamp = Date.now();
  const email = `e2e-${stamp}@example.com`;
  const handle = `e2e_${stamp}`.slice(0, 20);
  const password = `e2e-password-${stamp}`;
  const displayName = "E2E テスト";
  const reviewBody = `E2Eテストの口コミ ${stamp}`;

  let page: Page;
  let pair: DupePair;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    pair = await findDupePair();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("メールのリンクで新規登録できる", async () => {
    await page.goto("/login?mode=signup");
    await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();

    await page.getByLabel("メールアドレス").fill(email);
    await page.getByRole("button", { name: /メールを送る/ }).click();
    await expect(page.getByText("にメールを送りました。")).toBeVisible();

    await page.goto(await waitForAuthLink(email));

    // プロフィールがまだ無いので、プロフィール作成画面に着く。
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: "プロフィール作成" })).toBeVisible();
  });

  test("プロフィール作成画面でパスワードを設定できる", async () => {
    await page.locator("#settings-password").fill(password);
    await page.locator("#settings-password-confirmation").fill(password);
    await page.getByRole("button", { name: "パスワードを設定する" }).click();
    await expect(page.getByText("パスワードを設定しました")).toBeVisible();
  });

  test("プロフィールを作成するとマイページに移る", async () => {
    await page.getByLabel("表示名").fill(displayName);
    await page.getByLabel("ユーザーID").fill(handle);
    await page.getByRole("button", { name: "明るい", exact: true }).click();
    await page.getByRole("button", { name: "保存する" }).click();

    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByText(displayName).first()).toBeVisible();
    await expect(page.getByText(`@${handle}`)).toBeVisible();
  });

  test("メールアドレスとパスワードでログインするとマイページに移る", async () => {
    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill(email);
    await page.locator("#login-password").fill(password);
    await page.getByRole("button", { name: /ログインする/ }).click();

    // プロフィールが既にあるので、作成画面ではなくマイページに着く。
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByText(`@${handle}`)).toBeVisible();
  });

  test("リストから選んでポーチに登録できる", async () => {
    await page.goto("/stash");
    await expect(page.getByRole("heading", { name: /Myポーチ（0点）/ })).toBeVisible();

    await page.getByText("リストから選んで登録").click();
    const picker = page.locator("details", { hasText: "リストから選んで登録" });
    const candidates = picker.getByRole("button").filter({ hasNotText: /^追加$/ });
    await candidates.nth(0).click();
    await candidates.nth(1).click();
    await picker.getByRole("button", { name: "追加" }).click();

    await expect(page.getByRole("heading", { name: /Myポーチ（2点）/ })).toBeVisible();
  });

  test("ポーチと被る商品では、持っている商品を挙げて知らせる", async () => {
    await page.goto(`/products/${pair.owned.product_id}`);
    await page.getByRole("button", { name: "ポーチに追加" }).click();
    await expect(page.getByRole("button", { name: "ポーチに入っています" })).toBeVisible();

    await page.goto(`/products/${pair.target.id}`);
    const label = `${pair.owned.brand} ${pair.owned.name}`;
    await expect(
      page.getByText(new RegExp(`ポーチの「${escapeForRegExp(label)}」`)),
    ).toBeVisible();
  });

  test("口コミを投稿すると一覧に出る", async () => {
    await page.goto(`/products/${pair.target.id}`);
    await page.getByPlaceholder(/どんなときに使って/).fill(reviewBody);
    await page.getByRole("button", { name: "投稿する" }).click();

    await expect(page.getByText(reviewBody)).toBeVisible();
    await page.reload();
    await expect(page.getByText(reviewBody)).toBeVisible();
    await expect(page.getByText(displayName).first()).toBeVisible();
  });
});
