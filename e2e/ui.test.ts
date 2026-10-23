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

    // イベントの種類のバッジに module_commit または create_account が含まれることを検証
    // (seed の署名が不正なサンプルには「署名が不正」のバッジも付く)
    const firstBadge = eventCards
      .first()
      .locator(".badge:not(.badge-invalid-signature)");
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
      const filteredBadge = eventCards
        .first()
        .locator(".badge:not(.badge-invalid-signature)");
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

  test("expression tree editor renders AST structure, supports selection, and evaluates with stage1.wasm", async ({
    page,
  }) => {
    await page.goto("/part/sample.triangle-area");

    // パーツ定義ツリーが表示されていることを確認
    const defTree = page.locator(".part-definition-tree");
    await expect(defTree).toBeVisible({ timeout: 15000 });

    // AST ツリー内のキーワード・演算子バッジが表示されていることを確認
    const letBadge = defTree.locator(".tree-badge", { hasText: "let" });
    await expect(letBadge.first()).toBeVisible();

    const divideBadge = defTree.locator(".tree-badge", { hasText: "divide" });
    await expect(divideBadge.first()).toBeVisible();

    // ノードをクリックして選択状態になることを確認
    await divideBadge.first().click();
    await expect(divideBadge.first()).toHaveAttribute("data-state", "selected");

    // 「式を評価」ボタンをクリックして stage1.wasm による評価結果が 25 になることを検証
    const evalButton = page.locator(".part-actions button", {
      hasText: /Evaluate Expression|式を評価|Taksi esprimon/,
    });
    await expect(evalButton).toBeVisible();
    await evalButton.click();

    const resultCard = page.locator(".eval-result-card.success");
    await expect(resultCard).toBeVisible({ timeout: 15000 });
    await expect(resultCard).toContainText("25");
  });

  test("expression tree editor asks the definy type checker for the expected type and renames function parameters", async ({
    page,
  }) => {
    await page.goto("/part/std.abs");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });

    // 0 - x の 0 (数値の位置) を選ぶと, 型が合わない選択肢の区切りが出る (期待する型が number と分かる)
    const subtract = valueTree.locator(".tree-badge", { hasText: /^minus$/ });
    await subtract.first().click();
    // 検索欄には今の式の名前が入っているので, 空にして全ての選択肢を出す
    await page.locator(".dropdown-search-input").fill("");
    await expect(
      page.locator(".dropdown-option-heading", {
        hasText: /Other \(type does not match\)|その他 \(型が合わない\)|Aliaj/,
      }),
    ).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");

    // 引数名 x を選ぶとその場で名前を変えられ, 本体の変数の表示も変わる
    const parameter = valueTree
      .locator(".tree-badge", { hasText: /^x$/ })
      .first();
    await parameter.click();
    const input = valueTree.locator(".tree-badge input[type=text]");
    await expect(input).toBeVisible();
    await input.fill("value");
    // 本体の 3 か所の変数 (引数名の入力欄は文字を持たない)
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^value$/ }),
    ).toHaveCount(3);
    // パーツの型の引数名も合わせて変わる
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^value:$/ }),
    ).toHaveCount(1);
  });

  test("icons have bounded and non-zero dimensions across views", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector(".event-card");

    const rootIconSizes = await page.evaluate(() => {
      // 狭い画面でだけ出すボタン (エクスプローラーのドロワーを開くボタン) のように
      // display: none で描画されていないアイコンは除く
      const svgs = Array.from(document.querySelectorAll("svg")).filter(
        (svg) => svg.getClientRects().length > 0,
      );
      return svgs.map((svg) => {
        const rect = svg.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
        };
      });
    });

    expect(rootIconSizes.length).toBeGreaterThan(0);
    for (const size of rootIconSizes) {
      expect(size.width).toBeLessThanOrEqual(32);
      expect(size.height).toBeLessThanOrEqual(32);
      expect(size.width).toBeGreaterThanOrEqual(8);
      expect(size.height).toBeGreaterThanOrEqual(8);
    }

    await page.goto("/modules");
    await page.waitForSelector(".module-card");
    const moduleIcon = page.locator(".module-card-icon").first();
    const box = await moduleIcon.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(32);
      expect(box.height).toBeLessThanOrEqual(32);
      expect(box.width).toBeGreaterThanOrEqual(12);
      expect(box.height).toBeGreaterThanOrEqual(12);
    }
  });

  test("command palette opens with shortcut, fuzzy filters, and navigates", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector(".event-card");

    // ショートカット (Control+p) でコマンドパレットが開くことを確認
    await page.keyboard.press("Control+p");
    const palette = page.locator(".command-palette");
    await expect(palette).toBeVisible();

    // 入力欄に "about" を入力し、ファジー検索で "About definy" が最上位に来ることを確認
    const paletteInput = palette.locator(".command-palette-input input");
    await expect(paletteInput).toBeFocused();
    await paletteInput.fill("about");

    const firstItem = palette.locator(".command-palette-item").first();
    await expect(firstItem).toBeVisible();
    await expect(
      firstItem.locator(".command-palette-item-label"),
    ).toContainText(/About|definy について|Pri definy/);

    // Enter キーで選択項目へ遷移
    await paletteInput.press("Enter");
    await page.waitForURL(/\/about/, { timeout: 10000 });
    await expect(palette).not.toBeVisible();

    // 再度 Control+k ショートカットでも開閉できることを確認
    await page.keyboard.press("Control+k");
    await expect(palette).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette).not.toBeVisible();
  });

  test("about page displays definy philosophy, 4 core pillars, and comparison table", async ({
    page,
  }) => {
    await page.goto("/about");

    // ヒーローセクション
    await expect(page.locator(".about-view h1")).toHaveText("definy");
    await expect(
      page.locator(".about-view", {
        hasText:
          /Pure functional language|コンテンツアドレスと構造化編集|Pura funkcia lingvo/,
      }),
    ).toBeVisible();

    // 4大コアピラー
    const pillarCards = page.locator(".card", {
      hasText:
        /Structured Editing|構文エラーのない構造化編集|Strukturita Redaktado/,
    });
    await expect(pillarCards.first()).toBeVisible();

    // 比較表
    const table = page.locator("table");
    await expect(table).toBeVisible();
    await expect(table).toContainText("definy");
    await expect(table).toContainText(
      /Traditional Ecosystems|従来のエコシステム|Tradiciaj Ekosistemoj/,
    );

    // 組み込みモジュール
    const coreModuleCard = page.locator(".about-view a", { hasText: "core" });
    await expect(coreModuleCard.first()).toBeVisible();
  });

  test("creates an Ed25519 account, displays account badge, and lists account in /accounts", async ({
    page,
  }) => {
    await page.goto("/");

    // クライアントのハイドレーション完了を確認
    const eventCards = page.locator(".event-card");
    await expect(eventCards.first()).toBeVisible({ timeout: 15000 });

    const accountName = `alice_${Date.now().toString().slice(-6)}`;

    // 1. Click "Log In" button in header
    const loginButton = page.locator("header .header-actions button", {
      hasText: /Log In|ログイン|Ensaluti/,
    });
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // 2. AccountModal opens
    const dialog = page.locator("dialog.account-modal-dialog");
    await expect(dialog).toBeVisible();

    // 3. Fill in account name and submit
    const nameInput = page.locator("#create-account-name");
    await expect(nameInput).toBeVisible();
    await nameInput.fill(accountName);

    const createBtn = dialog.locator("button[type='submit']");
    await createBtn.click();

    // 4. Verify account created success message and secret key
    const successAlert = dialog.locator(".alert-success");
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    const secretKeyBox = dialog.locator(".secret-key-display");
    await expect(secretKeyBox).toBeVisible();
    const secretKey = await secretKeyBox.textContent();
    expect(secretKey?.trim().length).toBeGreaterThan(30);

    // Close modal
    const doneBtn = dialog.locator("button", { hasText: /Done|完了|Farita/ });
    await doneBtn.click();
    await expect(dialog).not.toBeVisible();

    // 5. Header shows account badge with name
    const accountBadge = page.locator(".header-control.account-badge");
    await expect(accountBadge).toBeVisible();
    await expect(accountBadge).toContainText(accountName);

    // 6. Navigate to /accounts and verify account is listed with "You" badge
    await page.goto("/accounts");
    const userCard = page
      .locator(".account-card", { hasText: accountName })
      .filter({ has: page.locator(".badge-success") });
    await expect(userCard).toBeVisible({ timeout: 10000 });
    await expect(userCard.locator(".badge-success")).toHaveText(
      /You|あなた|Vi/,
    );

    // 7. Test commit flow: stage a working change and commit from /changes
    await page.evaluate(() => {
      const changes = {
        parts: {
          "sample.e2e-part": {
            moduleDefinitionEventHash: "sample",
            partDefinitionEventHash: "sample.e2e-part",
            name: "e2e-part",
            description: [{ language: "en", text: "Part created in E2E test" }],
            partType: "number",
            expression: { Number: { value: 999 } },
          },
        },
      };
      localStorage.setItem(
        "definy.working_changes.v3",
        JSON.stringify(changes),
      );
    });

    await page.goto("/changes");
    const changeCard = page.locator(".change-card", { hasText: "e2e-part" });
    await expect(changeCard).toBeVisible({ timeout: 10000 });

    const messageInput = page.locator("#commit-message-input");
    await expect(messageInput).toBeVisible();
    await messageInput.fill("Add e2e-part via test");

    const commitBtn = page.locator("button[type='submit']", {
      hasText: /Sign & Commit|署名してコミット|Subskribi/,
    });
    await expect(commitBtn).toBeVisible();
    await commitBtn.click();

    // Verify commit success banner
    const commitSuccess = page.locator(".changes-view .alert-success");
    await expect(commitSuccess).toBeVisible({ timeout: 10000 });

    // Verify change card is cleared
    await expect(
      page.locator(".empty-state", {
        hasText:
          /No uncommitted changes|未コミットの変更はありません|Neniuj neenmetitaj ŝanĝoj/,
      }),
    ).toBeVisible();
  });

  test("definy logo and icon match definy.app styling and assets", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector(".logo-text");

    const logo = page.locator(".logo-text");
    await expect(logo).toHaveText("definy");

    const logoStyle = await logo.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        fontFamily: cs.fontFamily,
        color: cs.color,
        fontWeight: cs.fontWeight,
      };
    });

    // Check Hack font and #b9d09b (rgb(185, 208, 155))
    expect(logoStyle.fontFamily).toContain("Hack");
    expect(logoStyle.color).toBe("rgb(185, 208, 155)");
    expect(logoStyle.fontWeight).toBe("400");

    // Check icon link tag
    const faviconHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="icon"]');
      return link ? link.getAttribute("href") : null;
    });
    expect(faviconHref).toBe("/icon.png");

    // Check /icon.png can be fetched and matches 5126 bytes
    const iconRes = await page.request.get("/icon.png");
    expect(iconRes.ok()).toBe(true);
    const iconBuffer = await iconRes.body();
    expect(iconBuffer.length).toBe(5126);

    // Check /hack_regular_subset.woff2 can be fetched and matches 23244 bytes
    const fontRes = await page.request.get("/hack_regular_subset.woff2");
    expect(fontRes.ok()).toBe(true);
    const fontBuffer = await fontRes.body();
    expect(fontBuffer.length).toBe(23244);
  });
});
