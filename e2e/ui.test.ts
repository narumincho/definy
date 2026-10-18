import { expect, test } from "@playwright/test";

test.describe("definy UI E2E", () => {
  test("events timeline loads events and allows filtering", async ({
    page,
  }) => {
    await page.goto("/");

    // イベントカードが表示されるまで待機（バックエンドからイベント取得完了を確認）
    const eventCards = page.locator(".event-card");
    await expect(eventCards.first()).toBeVisible({ timeout: 15000 });

    const totalEvents = await eventCards.count();
    expect(totalEvents).toBeGreaterThanOrEqual(1);

    // イベントバッジに module_commit または create_account が含まれることを検証
    const firstBadge = eventCards.first().locator(".badge");
    await expect(firstBadge).toBeVisible();
    const badgeText = await firstBadge.textContent();
    expect(["module_commit", "create_account"]).toContain(badgeText?.trim());

    // フィルターチップの動作検証: アカウント作成 (create_account) フィルター
    const accountsChip = page
      .locator(".filter-chips button")
      .filter({ hasText: /Accounts|アカウント作成|Kontoj/ });
    if (await accountsChip.isVisible()) {
      await accountsChip.click();
      await page.waitForTimeout(300);

      const filteredCount = await eventCards.count();
      expect(filteredCount).toBeGreaterThanOrEqual(1);
      const filteredBadge = eventCards.first().locator(".badge");
      await expect(filteredBadge).toHaveText("create_account");

      // 「すべて」フィルターで全件に戻ることを確認
      const allChip = page
        .locator(".filter-chips button")
        .filter({ hasText: /All|すべて|Ĉiuj/ });
      await allChip.click();
      await page.waitForTimeout(300);
      expect(await eventCards.count()).toBe(totalEvents);
    }
  });

  test("modules page lists builtin modules", async ({ page }) => {
    await page.goto("/modules");

    const moduleCards = page.locator(".module-card");
    await expect(moduleCards.first()).toBeVisible({ timeout: 15000 });

    // core, sample などの主要モジュールが存在することを確認
    const moduleTitles = await page
      .locator(".module-card-title")
      .allTextContents();
    expect(moduleTitles).toContain("core");
    expect(moduleTitles).toContain("sample");
  });

  test("parts page lists parts, supports search and part navigation", async ({
    page,
  }) => {
    await page.goto("/parts");

    const partCards = page.locator(".part-card");
    await expect(partCards.first()).toBeVisible({ timeout: 15000 });

    const count = await partCards.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // 検索入力欄で "triangle" を絞り込み
    const searchInput = page.locator(".search-input");
    await searchInput.fill("triangle");
    await page.waitForTimeout(300);

    const filteredCards = page.locator(".part-card");
    await expect(filteredCards.first()).toBeVisible();
    await expect(filteredCards.first()).toContainText("triangle-area");

    // パーツカードをクリックしてパーツ詳細画面へ遷移
    await filteredCards.first().click();
    await page.waitForURL(/\/part\/.+/, { timeout: 10000 });

    // パンくずにモジュール名とパーツ名が表示されていることを確認
    const breadcrumb = page.locator(".breadcrumb-current");
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toHaveText("triangle-area");

    // 「式を評価」ボタンをクリックして評価を実行
    const evalButton = page.locator(".part-actions button");
    await expect(evalButton).toBeVisible();
    await evalButton.click();

    // 評価結果カード（成功またはエラー）が表示されることを確認
    const resultCard = page.locator(".eval-result-card");
    await expect(resultCard).toBeVisible({ timeout: 10000 });
  });
});
