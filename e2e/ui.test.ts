import { expect, test, type Locator } from "@playwright/test";

/**
 * 関数 `functionName` を呼び出す式のカプセル.
 * 呼び出しには見出しのバッジが無いので, 呼び出す関数 (ID が `.fn` で終わるノード) を含むいちばん内側のカプセルを探す
 */
function callCapsule(tree: Locator, functionName: string): Locator {
  return tree
    .locator(".tree-capsule", {
      has: tree.page().locator('[data-node-id$=".fn"]', {
        hasText: new RegExp(`^${functionName.replaceAll(".", "\\.")}$`),
      }),
    })
    .last();
}

/** 呼び出しのカプセルの左端 (子のノードの外側) をクリックして, 呼び出しそのものを選ぶ */
async function clickCallCapsule(capsule: Locator): Promise<void> {
  await capsule.click({ position: { x: 3, y: 8 } });
}

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

    // イベントの種類 (data-event-type) が module_commit または create_account であることを検証
    // (seed の署名が不正なサンプルには「署名が不正」のバッジも付く)
    await expect(eventCards.first().locator(".event-type")).toBeVisible();
    const firstType = await eventCards.first().getAttribute("data-event-type");
    expect(["module_commit", "create_account"]).toContain(firstType);

    // フィルターチップの動作検証: アカウント作成 (create_account) フィルター
    const accountsChip = page
      .locator(".filter-chips button")
      .filter({ hasText: /Accounts|アカウント作成|Kontoj/ });
    if (await accountsChip.isVisible()) {
      await accountsChip.click();
      await page.waitForTimeout(300);

      const filteredCount = await eventCards.count();
      expect(filteredCount).toBeGreaterThanOrEqual(1);
      await expect(eventCards.first()).toHaveAttribute(
        "data-event-type",
        "create_account",
      );

      // 「すべて」フィルターで全件に戻ることを確認
      const allChip = page
        .locator(".filter-chips button")
        .filter({ hasText: /All|すべて|Ĉiuj/ });
      await allChip.click();
      await page.waitForTimeout(300);
      expect(await eventCards.count()).toBe(totalEvents);
    }
  });

  test("page title follows the opened page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("definy");

    // クライアント側の遷移でもタイトルが変わる (Void が head.title で上書きしたあとに設定し直す)
    await page.locator('.activity-item[href="/parts"]').click();
    await expect(page).toHaveTitle("Parts | definy");

    await page
      .locator(".part-card", { hasText: "triangle-area" })
      .first()
      .click();
    await expect(page).toHaveTitle("sample.triangle-area | definy");

    await page.locator('.activity-item[href="/modules"]').click();
    await expect(page).toHaveTitle("Modules | definy");

    await page.goBack();
    await expect(page).toHaveTitle("sample.triangle-area | definy");

    // 直接開いたときと, 表示言語に合わせたタイトル
    await page.goto("/history?lang=ja");
    await expect(page).toHaveTitle("コミット履歴 | definy");
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
    const evalButton = page.locator(".part-actions button", {
      hasText: /Evaluate Expression|式を評価|Taksi esprimon/,
    });
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

    // AST ツリー内のキーワードと, 呼び出しているパーツ (core.divide) のバッジが表示されていることを確認
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

    // core.minus(left: 0, right: x) の呼び出し (数値の位置) を選ぶと, 型が合わない選択肢の区切りが出る
    // (期待する型が number と分かる). 呼び出す関数の名前は呼び出しの一部なので, 名前を押すと呼び出しを選ぶ
    const subtract = valueTree.locator(".tree-badge", {
      hasText: /^core\.minus$/,
    });
    await subtract.click();
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

  test("selecting a function-typed parameter makes a call with all its argument names", async ({
    page,
  }) => {
    await page.goto("/part/core.list-map");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    // f: (item) => f(item: item) の最後の item を, 関数型の引数 f に置き換える
    await valueTree
      .locator(".tree-badge", { hasText: /^item$/ })
      .last()
      .click();
    await page.locator(".dropdown-search-input").fill("f");
    await page.locator(".dropdown-option", { hasText: /^f\b/ }).first().click();
    // 関数は値として書けないので, 引数名 (item:) を入れた f の呼び出しになる
    await expect(
      valueTree.locator('[data-node-id$=".fn"]', { hasText: /^f$/ }),
    ).toHaveCount(2);
    // (パーツの型の行の f の引数名 item: もあるので 3 つ)
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^item:$/ }),
    ).toHaveCount(3);
  });

  test("hovering an expression shows its type and the documentation of the part", async ({
    page,
  }) => {
    await page.goto("/part/std.abs?lang=ja");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const card = page.locator(".tree-hover-card");

    // パーツの呼び出しは, 呼び出すパーツの名前・説明と, 呼び出しの結果の型
    await callCapsule(valueTree, "core.minus").hover({
      position: { x: 3, y: 8 },
    });
    await expect(card).toContainText("core.minus", { timeout: 15000 });
    await expect(card).toContainText("数値の減算");
    await expect(card.locator(".tree-hover-card-type")).toContainText("number");

    // 変数は名前と型 (definy 製の型チェッカーが推論した型)
    await valueTree.locator(".tree-badge", { hasText: /^x$/ }).nth(1).hover();
    await expect(card.locator(".tree-hover-card-title")).toContainText("x");
    await expect(card.locator(".tree-hover-card-type")).toContainText("number");

    // 置換メニューを開いている間は出さない
    await valueTree.locator(".tree-badge", { hasText: /^x$/ }).nth(1).click();
    await expect(card).toHaveCount(0);
  });

  test("expression tree editor edits match patterns with the tags of the target type", async ({
    page,
  }) => {
    await page.goto("/part/sample.is-even-sample");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const pattern = (tag: string) =>
      valueTree.locator(".tree-badge", { hasText: new RegExp(`^${tag} =>$`) });
    const option = (name: string) =>
      page.locator(".dropdown-option", {
        has: page.locator(".dropdown-option-name", {
          hasText: new RegExp(`^${name}$`),
        }),
      });

    // パターン true を選ぶと, 型チェッカーに聞いた対象の型 (Bool) のタグが選択肢に出る
    await pattern("true").click();
    await expect(option("false")).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");

    // false のアームを消すと, 足りないアームを足す選択肢が出る
    await pattern("false").click();
    await option("delete-arm").locator("button").first().click();
    await expect(pattern("false")).toHaveCount(0);
    await pattern("true").click();
    await option("add-missing-arms").locator("button").first().click();
    await expect(pattern("false")).toHaveCount(1);

    // `_ =>` (default) のアームを足して消す
    await pattern("true").click();
    await option("add-default").locator("button").first().click();
    await expect(pattern("_")).toHaveCount(1);
    await pattern("_").click();
    await option("delete-default").locator("button").first().click();
    await expect(pattern("_")).toHaveCount(0);

    // 束縛する変数の名前はその場で変えられ, 本体の変数の表示も変わる
    await page.goto("/part/sample.match-option-sample");
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    // 型パーツ (sample.option-number) を指定した Variant が対象なので, 型パーツのタグ none も選択肢に出る
    await pattern("some").click();
    await expect(option("none")).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");
    await valueTree
      .locator(".tree-badge", { hasText: /^val$/ })
      .first()
      .click();
    const input = valueTree.locator(".tree-badge input[type=text]");
    await expect(input).toBeVisible();
    await input.fill("n");
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^n$/ }),
    ).toHaveCount(1);
  });

  test("expression tree editor renames let variables and goes to the definition of a variable", async ({
    page,
  }) => {
    await page.goto("/part/sample.triangle-area");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const badge = (text: string) =>
      valueTree.locator(".tree-badge", { hasText: new RegExp(`^${text}$`) });
    const selected = valueTree.locator('.tree-badge[data-state="selected"]');

    // let の変数名 base を選ぶとその場で名前を変えられ, 本体の変数の表示も変わる
    await badge("base").first().click();
    const input = valueTree.locator(".tree-badge input[type=text]");
    await expect(input).toBeVisible();
    await input.fill("width");
    await expect(badge("width")).toHaveCount(1);
    await page.keyboard.press("Escape");

    // 本体の変数 width のメニューの go-to-definition で, let の変数名へ移動する
    await badge("width").last().click();
    await page
      .locator(".dropdown-option", { hasText: /^go-to-definition/ })
      .locator("button")
      .click();
    await expect(selected).toHaveText("width");

    // F12 でも移動できる
    await badge("height").last().click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("F12");
    await expect(selected).toHaveText("height");
    await expect(badge("height")).toHaveCount(2);
  });

  test("expression tree editor adds, moves, and deletes list items", async ({
    page,
  }) => {
    await page.goto("/part/sample.prime-numbers");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const items = async () =>
      (await valueTree.locator(".tree-badge").allTextContents()).filter((t) =>
        /^(\d+|□)$/.test(t),
      );
    const option = (name: string) =>
      page
        .locator(".dropdown-option", {
          has: page.locator(".dropdown-option-name", {
            hasText: new RegExp(`^${name}$`),
          }),
        })
        .locator("button");

    await expect.poll(items).toEqual(["2", "3", "5", "7", "11"]);
    // 要素 5 を前へ動かす
    await valueTree.locator(".tree-badge", { hasText: /^5$/ }).click();
    await option("move-item-earlier").click();
    await expect.poll(items).toEqual(["2", "5", "3", "7", "11"]);
    // 動かした要素が選ばれたままなので, 続けて消せる
    await expect(
      valueTree.locator('.tree-badge[data-state="selected"]'),
    ).toHaveText("5");
    await valueTree.locator(".tree-badge", { hasText: /^5$/ }).click();
    await option("delete-item").click();
    await expect.poll(items).toEqual(["2", "3", "7", "11"]);
    // 後ろに未入力の要素を足す
    await valueTree.locator(".tree-badge", { hasText: /^11$/ }).click();
    await option("insert-item-after").click();
    await expect.poll(items).toEqual(["2", "3", "7", "11", "□"]);
  });

  test("expression tree editor creates variants of type parts", async ({
    page,
  }) => {
    await page.goto("/part/sample.match-option-sample");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const badge = (text: string) =>
      valueTree.locator(".tree-badge", { hasText: new RegExp(`^${text}$`) });
    const option = (name: string) =>
      page.locator(".dropdown-option", {
        has: page.locator(".dropdown-option-name", {
          hasText: new RegExp(`^${name.replaceAll(".", "\\.")}$`),
        }),
      });

    // match の対象の Variant some(100) を選ぶと, 型パーツ sample.option-number のタグが選択肢に出る
    await badge("some").click();
    await expect(option("sample.option-number.some")).toHaveAttribute(
      "data-current",
      "true",
    );
    // 値を持たないタグにすると値が消える
    await option("sample.option-number.none").locator("button").first().click();
    await expect(badge("none")).toHaveCount(1);
    await expect(badge("100")).toHaveCount(0);
    // 値を持つタグにすると値が未入力になる
    await badge("none").click();
    await option("sample.option-number.some").locator("button").first().click();
    await expect(badge("some")).toHaveCount(1);
    await expect(badge("□")).toHaveCount(1);
  });

  test("expression tree editor adds, moves, and deletes let bindings", async ({
    page,
  }) => {
    await page.goto("/part/sample.triangle-area");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const badge = (text: string) =>
      valueTree.locator(".tree-badge", { hasText: new RegExp(`^${text}$`) });
    const option = (name: string) =>
      page
        .locator(".dropdown-option", {
          has: page.locator(".dropdown-option-name", {
            hasText: new RegExp(`^${name}$`),
          }),
        })
        .locator("button");
    /** let の束縛の変数名 (`名前 = 値` の名前) を上から順に */
    const bindingNames = async () =>
      (
        await valueTree
          .locator('[data-node-id$=".name"] .tree-badge')
          .allTextContents()
      ).filter((name) => name.length > 0);

    await expect.poll(bindingNames).toEqual(["base", "height"]);
    // base = 10 の値から後ろに束縛を足す
    await badge("10").click();
    await option("insert-binding-after").click();
    await expect.poll(bindingNames).toEqual(["base", "x", "height"]);
    // 足した束縛の値 (未入力) から後ろへ動かす
    await badge("□").click();
    await option("move-binding-later").click();
    await expect.poll(bindingNames).toEqual(["base", "height", "x"]);
    // 消す
    await badge("□").click();
    await option("delete-binding").click();
    await expect.poll(bindingNames).toEqual(["base", "height"]);
  });

  test("expression tree editor copies and pastes expressions through the OS clipboard across browsers", async ({
    page,
    browser,
  }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/part/sample.prime-numbers");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const items = async () =>
      (await valueTree.locator(".tree-badge").allTextContents()).filter((t) =>
        /^(\d+|□)$/.test(t),
      );
    await expect.poll(items).toEqual(["2", "3", "5", "7", "11"]);

    // 5 を選んでツリーに戻り, Ctrl+C で OS のクリップボードにコピーする
    await valueTree.locator(".tree-badge", { hasText: /^5$/ }).click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("ControlOrMeta+c");
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(JSON.parse(copied)).toMatchObject({
      format: "definy.expression",
      expression: { Number: { value: 5 } },
    });

    // 11 に Ctrl+V で貼り付ける
    await valueTree.locator(".tree-badge", { hasText: /^11$/ }).click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("ControlOrMeta+v");
    await expect.poll(items).toEqual(["2", "3", "5", "7", "5"]);

    // 2 を Ctrl+X で切り取ると未入力になる
    await valueTree.locator(".tree-badge", { hasText: /^2$/ }).click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("ControlOrMeta+x");
    await expect.poll(items).toEqual(["□", "3", "5", "7", "5"]);

    // 置換メニューの copy / paste でもコピー・貼り付けできる
    const option = (name: string) =>
      page
        .locator(".dropdown-option", {
          has: page.locator(".dropdown-option-name", {
            hasText: new RegExp(`^${name}$`),
          }),
        })
        .locator("button");
    await valueTree.locator(".tree-badge", { hasText: /^7$/ }).click();
    await option("copy").click();
    await valueTree.locator(".tree-badge", { hasText: /^□$/ }).click();
    await option("paste").click();
    await expect.poll(items).toEqual(["7", "3", "5", "7", "5"]);

    // 別のブラウザ (別のコンテキスト) でも, クリップボードの文字列を貼り付けられる
    const otherContext = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    try {
      const other = await otherContext.newPage();
      await other.goto(page.url());
      const otherTree = other
        .locator("#part-definition-value-tree, .part-definition-tree")
        .first();
      await expect(otherTree).toBeVisible({ timeout: 15000 });
      await other.evaluate(
        (text) => navigator.clipboard.writeText(text),
        copied,
      );
      // 数値の入力欄にフォーカスがあっても, definy の式なら選んだ式に貼り付ける
      await otherTree.locator(".tree-badge", { hasText: /^3$/ }).click();
      await other.keyboard.press("ControlOrMeta+v");
      await expect
        .poll(async () =>
          (await otherTree.locator(".tree-badge").allTextContents()).filter(
            (t) => /^(\d+|□)$/.test(t),
          ),
        )
        .toEqual(["2", "5", "5", "7", "11"]);
    } finally {
      await otherContext.close();
    }
  });

  test("part detail undoes and redoes edits with buttons and shortcuts", async ({
    page,
  }) => {
    await page.goto("/part/sample.prime-numbers");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const items = async () =>
      (await valueTree.locator(".tree-badge").allTextContents()).filter((t) =>
        /^(\d+|□)$/.test(t),
      );
    const undoButton = page.getByRole("button", {
      name: /^(Undo|元に戻す|Malfari)$/,
    });
    const redoButton = page.getByRole("button", {
      name: /^(Redo|やり直す|Refari)$/,
    });
    await expect(undoButton).toBeDisabled();

    // 要素を消して, ボタンで元に戻す・やり直す
    await valueTree.locator(".tree-badge", { hasText: /^3$/ }).click();
    await page
      .locator(".dropdown-option", { hasText: /^delete-item/ })
      .locator("button")
      .click();
    await expect.poll(items).toEqual(["2", "5", "7", "11"]);
    await undoButton.click();
    await expect.poll(items).toEqual(["2", "3", "5", "7", "11"]);
    await redoButton.click();
    await expect.poll(items).toEqual(["2", "5", "7", "11"]);

    // ショートカット (ツリーにフォーカスがある状態)
    await page.keyboard.press("Escape");
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(items).toEqual(["2", "3", "5", "7", "11"]);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect.poll(items).toEqual(["2", "5", "7", "11"]);

    // 数値の入力欄で続けて打った変更は 1 回で元に戻る
    await valueTree.locator(".tree-badge", { hasText: /^7$/ }).click();
    const input = valueTree.locator(".tree-badge input[type=number]");
    await input.pressSequentially("123");
    await expect.poll(items).toEqual(["2", "5", "11"]);
    await page.keyboard.press("Escape");
    await expect.poll(items).toEqual(["2", "5", "123", "11"]);
    await undoButton.click();
    await expect.poll(items).toEqual(["2", "5", "7", "11"]);
    // 全て元に戻すと作業中の変更も消える
    await undoButton.click();
    await expect(undoButton).toBeDisabled();
    await expect(
      page.locator(".badge", {
        hasText: /Modified|編集中の変更あり|Modifita/,
      }),
    ).toHaveCount(0);
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
