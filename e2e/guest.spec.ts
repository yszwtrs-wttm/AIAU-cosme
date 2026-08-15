import { expect, test } from "@playwright/test";
import { someProduct } from "./helpers/db";

test.describe("未ログインの閲覧", () => {
  test("トップから商品を検索して詳細まで見られる", async ({ page }) => {
    const product = await someProduct();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /自分に合ってる/ })).toBeVisible();

    await page.getByRole("link", { name: /ログインせずに探す/ }).click();
    await expect(page.getByRole("heading", { name: "商品を探す" })).toBeVisible();

    await page.getByPlaceholder(/商品名.*で探す/).fill(product.name);
    await page.getByRole("button", { name: "検索" }).click();

    const card = page.locator('a[href^="/products/"]').first();
    await expect(card).toBeVisible();
    await card.click();

    await expect(page.getByRole("heading", { name: "商品説明" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "使った人の口コミ" })).toBeVisible();
  });

  test("口コミの投稿にはログインが必要と案内される", async ({ page }) => {
    const product = await someProduct();

    await page.goto(`/products/${product.id}`);
    await expect(page.getByText("口コミを書くにはログインが必要です。")).toBeVisible();
    await expect(page.getByRole("button", { name: "投稿する" })).toHaveCount(0);
  });

  test("ポーチはログインしないと開けない", async ({ page }) => {
    await page.goto("/stash");
    await expect(page).toHaveURL(/\/login/);
  });
});
