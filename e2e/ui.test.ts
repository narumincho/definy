import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type Locator,
} from "@playwright/test";
import {
  createSignedAccountEvent,
  generateAccountCredentials,
  type AccountCredentials,
  type SignedEventResult,
  type SignedProjectCommitResult,
} from "../src/auth.ts";
import { createSignedSingleModuleCommitEvent } from "../src/test_commit.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "../src/cbor.ts";

/** イベントを `SubmitEvent` で出す. プロジェクトのコミットなら先にパーツの中身を `UploadContent` で送る */
async function submitEvent(
  request: APIRequestContext,
  signed: SignedEventResult | SignedProjectCommitResult,
): Promise<APIResponse> {
  if ("contents" in signed) {
    const uploaded = await request.post(
      "/definy.v1.EventService/UploadContent",
      { data: { items: [...signed.contents.values()] } },
    );
    expect(uploaded.ok(), await uploaded.text()).toBe(true);
  }
  return request.post("/definy.v1.EventService/SubmitEvent", {
    data: { signedEventBytes: signed.signedEventBytes },
  });
}

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

    // イベントの種類 (data-event-type) が project_commit または create_account であることを検証
    // (seed の署名が不正なサンプルには「署名が不正」のバッジも付く)
    await expect(eventCards.first().locator(".event-type")).toBeVisible();
    const firstType = await eventCards.first().getAttribute("data-event-type");
    expect(["project_commit", "create_account"]).toContain(firstType);

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

  test("timeline links to accounts, projects, parts and event details", async ({
    page,
  }) => {
    await page.goto("/");
    const commitCard = page
      .locator('.event-card[data-event-type="project_commit"]')
      .filter({ has: page.locator(".event-part-chip") })
      .first();
    await expect(commitCard).toBeVisible({ timeout: 15000 });

    // 作成者のリンクでアカウントのページへ行き, そのアカウントのイベントが並ぶ
    await commitCard.locator(".account-link").click();
    await page.waitForURL(/\/account\//);
    await expect(page.locator(".account-detail-name")).toBeVisible();
    await expect(page.locator(".event-card").first()).toBeVisible();

    // プロジェクト名のリンクでプロジェクトのページへ
    await page.goto("/");
    await commitCard.locator(".event-summary-link").click();
    await page.waitForURL(/\/project\//);
    await expect(page.locator(".module-commit").first()).toBeVisible();

    // パーツのチップでパーツのページへ
    await page.goto("/");
    const chip = commitCard.locator(".event-part-chip").first();
    const partName = await chip.textContent();
    await chip.click();
    await page.waitForURL(/\/part\//);
    await expect(
      page.locator('.hierarchy-segment[aria-current="page"] .hierarchy-name'),
    ).toHaveText(partName ?? "");

    // カードのリンク以外の場所 (時刻) を押すとイベント詳細へ. 時刻の上にはカード全体のリンクが重なっている
    await page.goto("/");
    await commitCard.locator(".event-time").click({ force: true });
    await page.waitForURL(/\/event\//);
    await expect(page.locator(".event-detail-header")).toBeVisible();
    await expect(page.locator(".detail-meta-grid").first()).toBeVisible();
    await expect(page.locator(".event-detail-part").first()).toBeVisible();
  });

  test("page title follows the opened page", async ({ page }) => {
    await page.goto("/?lang=en");
    await expect(page).toHaveTitle("definy");

    // クライアント側の遷移でもタイトルが変わる
    await page.locator('.activity-item[href^="/modules"]').click();
    await expect(page).toHaveURL(/\/modules\?lang=en$/);
    await expect(page).toHaveTitle("Modules | definy");

    // パーツ名はクライアントのデータから決まる (Void が head() のタイトルで上書きしたあとに設定し直す)
    await page
      .locator(".sidebar-tree-node.part-node", { hasText: /^triangle-area$/ })
      .first()
      .click();
    await expect(page).toHaveTitle("sample.triangle-area | definy");

    await page.goBack();
    await expect(page).toHaveTitle("Modules | definy");

    // サーバーが返す HTML のタイトルも表示言語に合わせる
    const response = await page.request.get("/history?lang=ja");
    expect(await response.text()).toContain(
      "<title>コミット履歴 | definy</title>",
    );
    await page.goto("/history?lang=ja");
    await expect(page).toHaveTitle("コミット履歴 | definy");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  });

  test("language is decided by ?lang= and redirects by Accept-Language", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "ja-JP" });
    const page = await context.newPage();
    // ?lang= が無ければ Accept-Language から決めた ?lang= 付きの URL にリダイレクトする
    await page.goto("/parts");
    await expect(page).toHaveURL(/\/parts\?lang=ja$/);
    await expect(page.locator(".view-title")).toHaveText("パーツ一覧");

    // サイト内のリンクは今の言語を引き継ぐ
    await page.locator('.activity-item[href^="/modules"]').click();
    await expect(page).toHaveURL(/\/modules\?lang=ja$/);

    // 言語を切り替えると URL が変わる. localStorage には保存しないので, ?lang= を付けて開き直せば元の言語
    // ハイドレーション前の select の変更は拾われないので, URL が変わるまで選び直す
    await expect(async () => {
      await page.locator(".language-select").selectOption("ja");
      await page.locator(".language-select").selectOption("eo");
      await expect(page).toHaveURL(/\/modules\?lang=eo$/, { timeout: 1000 });
    }).toPass();
    await expect(page.locator(".view-title")).toHaveText("Moduloj");
    await expect(page).toHaveTitle("Moduloj | definy");
    await page.goto("/modules?lang=en");
    await expect(page.locator(".view-title")).toHaveText("Modules");
    await context.close();
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

  test("seed modules stay listed after more than 100 newer events (#761)", async ({
    page,
    request,
  }) => {
    // seed のコミットより新しいイベントを 100 件より多く作る. UI は最新の 100 件のイベントだけでなく
    // 各ブランチの最新のコミット (GetModuleBranches) からモジュールを作るので, core などは消えない
    for (let i = 0; i < 105; i += 1) {
      const credentials = await generateAccountCredentials(`filler_${i}`);
      const { signedEventBytes } = await createSignedAccountEvent(credentials);
      const res = await request.post("/definy.v1.EventService/SubmitEvent", {
        data: { signedEventBytes },
      });
      expect(res.ok()).toBe(true);
    }
    await page.goto("/modules");
    await expect(
      page.locator(".module-card-title", { hasText: /^core$/ }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator(".module-card-title", { hasText: /^sample$/ }),
    ).toBeVisible();
    // 型環境にも残っている (core のパーツを開くと型エラーにならず型が出る)
    await page.goto("/project/definy");
    await expect(page.locator(".module-commit").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("creates parts and a module from the UI, commits them, and deletes a part (#760)", async ({
    page,
    request,
  }) => {
    // アカウントはテストから作り, localStorage に入れてログインした状態にする
    const credentials = await generateAccountCredentials(
      `maker_${Date.now().toString().slice(-6)}`,
    );
    const created = await request.post("/definy.v1.EventService/SubmitEvent", {
      data: {
        signedEventBytes: (await createSignedAccountEvent(credentials))
          .signedEventBytes,
      },
    });
    expect(created.ok()).toBe(true);
    await page.addInitScript((account) => {
      localStorage.setItem("definy.account.v1", JSON.stringify(account));
    }, credentials);
    const moduleName = `made_${Date.now().toString().slice(-6)}`;

    // 新しいモジュールに関数のパーツを 2 つ作る
    for (const [name, parameters] of [
      ["square", "x"],
      ["add", "a, b"],
    ] as const) {
      await page.goto("/new-part");
      // ハイドレーションの前に入力すると消えるので, イベントを読み終わるのを待つ
      await expect(page.locator(".connection-status-connected")).toBeVisible({
        timeout: 15000,
      });
      await page.locator("#new-part-module").fill(moduleName);
      if (name === "square") {
        await expect(
          page.getByText("This module does not exist yet"),
        ).toBeVisible();
      }
      await page.locator("#new-part-name").fill(name);
      await page.locator("#new-part-parameters").fill(parameters);
      await page.locator(".new-part-form button[type='submit']").click();
      await expect(page).toHaveURL(new RegExp(`/part/${moduleName}\\.${name}`));
      await expect(
        page
          .locator(".part-definition-tree, #part-definition-value-tree")
          .first(),
      ).toBeVisible({ timeout: 15000 });
    }
    // 本体が未入力のままではコミットできない (サーバーと同じく未入力を拒否する)
    await page.goto("/parts?changes=only");
    await expect(
      page.locator(".commit-type-check .alert-danger"),
    ).toContainText("unfilled hole", { timeout: 15000 });
    // 本体を引数で埋める
    for (const [name, parameter] of [
      ["square", "x"],
      ["add", "a"],
    ] as const) {
      await page.goto(`/part/${moduleName}.${name}`);
      const valueTree = page
        .locator("#part-definition-value-tree, .part-definition-tree")
        .first();
      await expect(valueTree).toBeVisible({ timeout: 15000 });
      await valueTree.locator(".tree-badge", { hasText: /^□$/ }).click();
      await page.locator(".dropdown-search-input").fill(parameter);
      await page
        .locator(".dropdown-option", { hasText: new RegExp(`^${parameter}`) })
        .first()
        .click();
      await expect(
        valueTree.locator(".tree-badge", { hasText: /^□$/ }),
      ).toHaveCount(0);
    }
    // 同じ名前は作れない
    await page.goto(`/new-part?module=${moduleName}`);
    await expect(page.locator(".connection-status-connected")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("#new-part-module")).toHaveValue(moduleName);
    await page.locator("#new-part-name").fill("add");
    await page.locator(".new-part-form button[type='submit']").click();
    await expect(page.locator(".new-part-form .alert-danger")).toContainText(
      "already has a part",
    );
    // エクスプローラーにもコミット前の新しいパーツが出る
    // (同じ dev サーバーで前に流したテストの square もあるので, このモジュールのプロジェクトの中で数える)
    await expect(
      page
        .locator(`.sidebar-project-group[data-project="${moduleName}"]`)
        .locator(".sidebar-tree-node.part-node", {
          has: page.locator(".sidebar-node-label", { hasText: /^square$/ }),
        }),
    ).toHaveCount(1);

    // コミットするとモジュールができる
    await page.goto("/parts?changes=only");
    await expect(page.locator(".connection-status-connected")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(".change-card .badge-success")).toHaveCount(2);
    await expect(page.locator("p#commit-branch-input")).toContainText(
      "Create the project",
    );
    await page.locator("#commit-message-input").fill("Create module");
    const commitButton = page.locator("button[type='submit']", {
      hasText: /Sign & Commit/,
    });
    await commitButton.click();
    await expect(page.locator(".changes-view .alert-success")).toBeVisible({
      timeout: 15000,
    });
    await page.goto(`/module/${moduleName}`);
    await expect(page.locator(".part-grid .part-card")).toHaveCount(2, {
      timeout: 15000,
    });

    // パーツを削除してコミットすると, モジュールから外れる
    await page.goto(`/part/${moduleName}.add`);
    await page.locator(".part-delete-button").click();
    await expect(page.locator(".part-deleted-banner")).toBeVisible();
    await page.goto("/parts?changes=only");
    await expect(page.locator(".connection-status-connected")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator(".change-card .badge-invalid-signature"),
    ).toContainText("Delete");
    await page.locator("#commit-message-input").fill("Delete add");
    await commitButton.click();
    await expect(page.locator(".changes-view .alert-success")).toBeVisible({
      timeout: 15000,
    });
    await page.goto(`/module/${moduleName}`);
    await expect(page.locator(".part-grid .part-card")).toHaveCount(1, {
      timeout: 15000,
    });
    await expect(page.locator(".part-grid .part-card")).toContainText("square");
  });

  test("edits record type fields and reads a field of a record parameter", async ({
    page,
    request,
  }) => {
    const credentials = await generateAccountCredentials(
      `recorder_${Date.now().toString().slice(-6)}`,
    );
    const created = await request.post("/definy.v1.EventService/SubmitEvent", {
      data: {
        signedEventBytes: (await createSignedAccountEvent(credentials))
          .signedEventBytes,
      },
    });
    expect(created.ok()).toBe(true);
    await page.addInitScript((account) => {
      localStorage.setItem("definy.account.v1", JSON.stringify(account));
    }, credentials);
    const moduleName = `records_${Date.now().toString().slice(-6)}`;
    await page.goto(`/new-part?module=${moduleName}`);
    await expect(page.locator(".connection-status-connected")).toBeVisible({
      timeout: 15000,
    });
    await page.locator("#new-part-module").fill(moduleName);
    await page.locator("#new-part-name").fill("get-y");
    await page.locator("#new-part-parameters").fill("p");
    await page.locator(".new-part-form button[type='submit']").click();
    await expect(page).toHaveURL(new RegExp(`/part/${moduleName}\\.get-y`));
    const typeTree = page.locator("#part-def-type-tree");
    const valueTree = page.locator("#part-def-value-tree");
    await expect(typeTree).toBeVisible({ timeout: 15000 });

    // 引数 p の型をレコードにし, フィールドを足して名前を変える
    await typeTree
      .locator(".tree-badge", { hasText: /^number$/ })
      .first()
      .click();
    await page
      .locator(".dropdown-option", { hasText: /^record/ })
      .first()
      .click();
    await typeTree.locator(".tree-badge", { hasText: /^record$/ }).click();
    await page.locator(".dropdown-option", { hasText: /^add-field/ }).click();
    await typeTree.locator(".tree-badge", { hasText: /^field$/ }).click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("y");
    await page.keyboard.press("Enter");
    await expect(typeTree).toContainText("recordkeystringynumber");

    // 本体はフィールドを取り出す選択肢 p.y
    await valueTree.locator(".tree-badge", { hasText: /^□$/ }).click();
    await page.locator(".dropdown-search-input").fill("p.y");
    await page
      .locator(".dropdown-option", { hasText: /^p\.y/ })
      .first()
      .click();
    await expect(valueTree).toContainText("p.y");

    await page.goto("/parts?changes=only");
    await expect(page.locator(".connection-status-connected")).toBeVisible({
      timeout: 15000,
    });
    await page.locator("#commit-message-input").fill("get-y");
    await expect(page.locator(".commit-type-check .alert-danger")).toHaveCount(
      0,
      { timeout: 15000 },
    );
    await page
      .locator("button[type='submit']", { hasText: /Sign & Commit/ })
      .click();
    await expect(page.locator(".changes-view .alert-success")).toBeVisible({
      timeout: 15000,
    });
  });

  test("refers to and runs uncommitted parts, and keeps references when a part is renamed", async ({
    page,
    request,
  }) => {
    const credentials = await generateAccountCredentials(
      `renamer_${Date.now().toString().slice(-6)}`,
    );
    const created = await request.post("/definy.v1.EventService/SubmitEvent", {
      data: {
        signedEventBytes: (await createSignedAccountEvent(credentials))
          .signedEventBytes,
      },
    });
    expect(created.ok()).toBe(true);
    await page.addInitScript((account) => {
      localStorage.setItem("definy.account.v1", JSON.stringify(account));
    }, credentials);
    const moduleName = `fresh_${Date.now().toString().slice(-6)}`;
    for (const name of ["double", "quad"]) {
      await page.goto(`/new-part?module=${moduleName}`);
      await expect(page.locator(".connection-status-connected")).toBeVisible({
        timeout: 15000,
      });
      await page.locator("#new-part-module").fill(moduleName);
      await page.locator("#new-part-name").fill(name);
      await page.locator(".new-part-form button[type='submit']").click();
      await expect(page).toHaveURL(new RegExp(`/part/${moduleName}\\.${name}`));
    }
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    const fillHole = async (query: string, option: RegExp): Promise<void> => {
      await valueTree.locator(".tree-badge", { hasText: /^□$/ }).last().click();
      await page.locator(".dropdown-search-input").fill(query);
      await page
        .locator(".dropdown-option", { hasText: option })
        .first()
        .click();
    };
    // double = core.plus(x, x)
    await page.goto(`/part/${moduleName}.double`);
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    await fillHole("core.plus", /^core\.plus/);
    await fillHole("x", /^x/);
    await fillHole("x", /^x/);
    // quad = double(double(x)): コミットしていない double も選択肢に出る
    await page.goto(`/part/${moduleName}.quad`);
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const doubleOption = new RegExp(`^${moduleName}\\.double`);
    await fillHole(`${moduleName}.double`, doubleOption);
    await fillHole(`${moduleName}.double`, doubleOption);
    await fillHole("x", /^x/);
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^□$/ }),
    ).toHaveCount(0);

    // コミットしていない quad をそのまま実行パネルで実行できる
    const runPanel = page.locator(".run-panel");
    if (!(await runPanel.isVisible())) {
      await page.keyboard.press("Control+`");
    }
    await expect(runPanel).toBeVisible();
    await runPanel.locator(".run-panel-use-part").click();
    await runPanel.locator(".tree-badge", { hasText: /^□$/ }).click();
    await page
      .locator(".dropdown-option", { hasText: /^number/ })
      .first()
      .click();
    await runPanel.locator("[data-node-id]", { hasText: /^0$/ }).last().click();
    await runPanel.locator("input[type='number']").fill("3");
    await page.keyboard.press("Enter");
    await runPanel.locator(".run-panel-run").click();
    await expect(runPanel.locator(".run-history-output").first()).toHaveText(
      "12",
      { timeout: 30000 },
    );

    // 名前を変えると, 参照している quad も新しい名前のパーツを参照する
    await page.goto(`/part/${moduleName}.double`);
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    await page.locator("input.def-name-input").fill("twice");
    await page.goto(`/part/${moduleName}.quad`);
    await expect(valueTree).toContainText(`${moduleName}.twice`, {
      timeout: 15000,
    });
    await expect(valueTree).not.toContainText(`${moduleName}.double`);

    // 型エラーなくコミットできる
    await page.goto("/parts?changes=only");
    await expect(page.locator(".connection-status-connected")).toBeVisible({
      timeout: 15000,
    });
    await page.locator("#commit-message-input").fill("twice and quad");
    await expect(page.locator(".commit-type-check .alert-danger")).toHaveCount(
      0,
      { timeout: 15000 },
    );
    await page
      .locator("button[type='submit']", { hasText: /Sign & Commit/ })
      .click();
    await expect(page.locator(".changes-view .alert-success")).toBeVisible({
      timeout: 15000,
    });
  });

  test("makes a part and a module private and commits it (#624)", async ({
    page,
    request,
  }) => {
    const suffix = Date.now().toString().slice(-6);
    const credentials = await generateAccountCredentials(`vis_${suffix}`);
    const submit = async (
      signed: SignedEventResult | SignedProjectCommitResult,
    ): Promise<void> => {
      const res = await submitEvent(request, signed);
      expect(res.ok(), await res.text()).toBe(true);
    };
    await submit(await createSignedAccountEvent(credentials));
    const moduleName = `vis_${suffix}`;
    await submit(
      await createSignedSingleModuleCommitEvent({
        credentials,
        moduleName,
        moduleDescription: [],
        message: "Create",
        parts: ["secret", "open"].map((name) => ({
          name,
          description: [],
          partType: { "#type_number": null },
          expression: { "#number": 1 },
        })),
      }),
    );
    await page.addInitScript((account) => {
      localStorage.setItem("definy.account.v1", JSON.stringify(account));
    }, credentials);

    await page.goto(`/part/${moduleName}.secret`);
    const partVisibility = page.locator("#part-visibility-select");
    await expect(partVisibility).toHaveValue("public", { timeout: 15000 });
    await partVisibility.selectOption("private");
    await page.goto(`/module/${moduleName}`);
    const moduleVisibility = page.locator("#module-visibility-select");
    await expect(moduleVisibility).toHaveValue("public", { timeout: 15000 });
    await moduleVisibility.selectOption("private");

    await page.goto("/parts?changes=only");
    await expect(page.locator(".module-visibility-change")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(".change-visibility")).toContainText("Private");
    await page.locator("#commit-message-input").fill("Make private");
    await page
      .locator("button[type='submit']", { hasText: /Sign & Commit/ })
      .click();
    await expect(page.locator(".changes-view .alert-success")).toBeVisible({
      timeout: 15000,
    });

    await page.goto(`/module/${moduleName}`);
    await expect(moduleVisibility).toHaveValue("private", { timeout: 15000 });
    await expect(page.locator(".part-card .private-badge")).toHaveCount(1);
    await expect(
      page
        .locator(".part-card", { hasText: "secret" })
        .locator(".private-badge"),
    ).toBeVisible();
  });

  test("edits the definition expression of a part with a user-made definition part and commits it", async ({
    page,
    request,
  }) => {
    const suffix = Date.now().toString().slice(-6);
    const credentials = await generateAccountCredentials(`def_${suffix}`);
    const submit = async (
      signed: SignedEventResult | SignedProjectCommitResult,
    ): Promise<void> => {
      const res = await submitEvent(request, signed);
      expect(res.ok(), await res.text()).toBe(true);
    };
    await submit(await createSignedAccountEvent(credentials));
    const moduleName = `def_${suffix}`;
    const core = deriveModuleIdBytes("core");
    const tagged = (tag: string, payload?: unknown, typePart?: string) => ({
      "#variant": {
        tag,
        payload:
          payload === undefined ? { "#none": null } : { "#some": payload },
        type_part:
          typePart === undefined ? { "#none": null } : { "#some": typePart },
      },
    });
    // define-number(value) = core.define-part(description: [], visibility: public,
    //   part_type: some(quote(number).expression), expression: some(number(value)))
    await submit(
      await createSignedSingleModuleCommitEvent({
        credentials,
        moduleName,
        moduleDescription: [],
        message: "Create",
        parts: [
          {
            name: "define-number",
            description: [],
            partType: {
              "#type_function": {
                parameters: [{ name: "value", type: { "#type_number": null } }],
                return_type: {
                  "#part_reference": {
                    part_definition_event_hash: deriveModulePartId(
                      core,
                      "part-content",
                    ),
                  },
                },
              },
            },
            expression: {
              "#function": {
                parameters: [{ parameter_id: 0, parameter_name: "value" }],
                body: {
                  "#call": {
                    function: {
                      "#part_reference": {
                        part_definition_event_hash: deriveModulePartId(
                          core,
                          "define-part",
                        ),
                      },
                    },
                    arguments: [
                      { name: "description", value: { "#list": [] } },
                      { name: "visibility", value: tagged("public") },
                      {
                        name: "part_type",
                        value: tagged("some", {
                          "#record_get": {
                            record: { "#quote": { "#type_number": null } },
                            key: "expression",
                          },
                        }),
                      },
                      {
                        name: "expression",
                        value: tagged(
                          "some",
                          tagged(
                            "number",
                            { "#variable": { variable_id: 0 } },
                            deriveModulePartId(core, "expression"),
                          ),
                        ),
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            name: "answer",
            description: [],
            partType: { "#type_number": null },
            expression: { "#number": 1 },
          },
        ],
      }),
    );
    await page.addInitScript((account) => {
      localStorage.setItem("definy.account.v1", JSON.stringify(account));
    }, credentials);

    // 定義の式で表示すると core.define-part(...) の呼び出しになっている
    await page.goto(`/part/${moduleName}.answer`);
    await page
      .locator(".def-view-switch-button[data-view=definition]")
      .click({ timeout: 15000 });
    const definitionTree = page.locator("#part-def-definition-tree");
    const definePart = definitionTree.locator(".tree-badge", {
      hasText: /^core\.define-part$/,
    });
    await expect(definePart).toBeVisible();

    // 定義のパーツを自分で作った define-number に置き換えて, value: に 42 を書く
    await definePart.click();
    await page.locator(".dropdown-search-input").fill("define-number");
    await page
      .locator(".dropdown-option", { hasText: `${moduleName}.define-number` })
      .first()
      .click();
    await definitionTree.locator(".tree-badge", { hasText: /^□$/ }).click();
    await page.locator(".dropdown-search-input").fill("number");
    await page
      .locator(".dropdown-option", { hasText: /^number\s*0/ })
      .first()
      .click();
    await definitionTree.locator(".tree-badge", { hasText: /^0$/ }).click();
    await definitionTree
      .locator(".tree-badge input[type=number]")
      .pressSequentially("42");
    await page.keyboard.press("Escape");

    // definy 製の評価器で評価した中身が, 項目ごとの表示の型と式になる
    await page.locator(".def-view-switch-button[data-view=fields]").click();
    await expect(page.locator(".def-notice")).toBeVisible();
    await expect(
      page.locator("#part-def-value-tree .tree-badge", { hasText: /^42$/ }),
    ).toBeVisible({ timeout: 15000 });

    // コミットすると定義の式のまま預けられ, 読み直すと定義の式で表示する
    await page.goto("/parts?changes=only");
    await page.locator("#commit-message-input").fill("Use define-number");
    await page
      .locator("button[type='submit']", { hasText: /Sign & Commit/ })
      .click();
    await expect(page.locator(".changes-view .alert-success")).toBeVisible({
      timeout: 15000,
    });
    await page.goto(`/part/${moduleName}.answer`);
    await expect(
      page.locator(".def-view-switch-button[data-view=definition]"),
    ).toHaveAttribute("aria-checked", "true", { timeout: 15000 });
    await expect(
      page.locator("#part-def-definition-tree .tree-badge", {
        hasText: `${moduleName}.define-number`,
      }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator("#part-def-definition-tree .tree-badge", {
        hasText: /^42$/,
      }),
    ).toBeVisible();
  });

  test("the creator of main merges another account's branch into main", async ({
    page,
    request,
  }) => {
    const suffix = Date.now().toString().slice(-6);
    const alice = await generateAccountCredentials(`alice_m${suffix}`);
    const bob = await generateAccountCredentials(`bob_m${suffix}`);
    const submit = async (
      signed: SignedEventResult | SignedProjectCommitResult,
    ): Promise<string> => {
      const res = await submitEvent(request, signed);
      expect(res.ok(), await res.text()).toBe(true);
      return ((await res.json()) as { readonly eventHash: string }).eventHash;
    };
    for (const credentials of [alice, bob]) {
      await submit(await createSignedAccountEvent(credentials));
    }
    const moduleName = `merge_${suffix}`;
    let time = Math.floor(Date.now() / 1000) - 60;
    const commit = async (
      credentials: AccountCredentials,
      branch: string,
      parentCommitHash: string | null,
      values: Readonly<Record<string, number>>,
    ): Promise<string> =>
      submit(
        await createSignedSingleModuleCommitEvent(
          {
            credentials,
            moduleName,
            branch,
            moduleDescription: [],
            message: `${branch} ${JSON.stringify(values)}`,
            parentCommitHash,
            parts: Object.entries(values).map(([name, value]) => ({
              name,
              description: [],
              partType: { "#type_number": null },
              expression: { "#number": value },
            })),
          },
          (time += 1),
        ),
      );
    // alice の main と, そこから分かれた bob のブランチ. 両方とも先へ進める
    const main1 = await commit(alice, "main", null, { a: 1, b: 2 });
    await commit(alice, "main", main1, { a: 10, b: 2 });
    await commit(bob, "bob", main1, { a: 1, b: 20, c: 3 });

    await page.addInitScript((account) => {
      localStorage.setItem("definy.account.v1", JSON.stringify(account));
    }, alice);
    // プロジェクト名は省くとモジュール名と同じ (src/test_commit.ts)
    await page.goto(`/project/${moduleName}`);
    const branchSelect = page.locator("#project-branch-select");
    await expect(branchSelect).toBeVisible({ timeout: 15000 });
    await branchSelect.selectOption("bob");
    await page.locator(".module-merge-button").click();
    // main に切り替わり, 取り込んだ変更が作業中の変更になる
    await expect(page.locator(".module-merge-notice")).toBeVisible();
    await expect(branchSelect).toHaveValue("main");
    await page.goto("/parts?changes=only");
    await expect(page.locator(".change-card")).toHaveCount(2, {
      timeout: 15000,
    });
    await expect(page.locator(".commit-merge-info")).toBeVisible();
    await page.locator("#commit-message-input").fill("Merge bob");
    await page
      .locator("button[type='submit']", { hasText: /Sign & Commit/ })
      .click();
    await expect(page.locator(".changes-view .alert-success")).toBeVisible({
      timeout: 15000,
    });
    // main は a を alice のまま, b と c を bob から取り込んだもの. 履歴に取り込みが出る
    await page.goto(`/project/${moduleName}`);
    await expect(branchSelect).toHaveValue("main", { timeout: 15000 });
    await expect(
      page
        .locator(".module-commit", { hasText: "Merge bob" })
        .locator(".badge"),
    ).toBeVisible();
    await page.goto(`/module/${moduleName}`);
    await expect(page.locator(".part-grid .part-card")).toHaveCount(3, {
      timeout: 15000,
    });
    await page.goto(`/part/${moduleName}.b`);
    await expect(
      page
        .locator("#part-definition-value-tree, .part-definition-tree")
        .first()
        .locator(".tree-badge", { hasText: /^20$/ }),
    ).toBeVisible({ timeout: 15000 });
    await page.goto(`/part/${moduleName}.a`);
    await expect(
      page
        .locator("#part-definition-value-tree, .part-definition-tree")
        .first()
        .locator(".tree-badge", { hasText: /^10$/ }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("explorer shows project / branch / commit / module / part and adds a branch", async ({
    page,
    request,
  }) => {
    const suffix = Date.now().toString().slice(-6);
    const alice = await generateAccountCredentials(`alice_b${suffix}`);
    const submit = async (
      signed: SignedEventResult | SignedProjectCommitResult,
    ): Promise<void> => {
      const res = await submitEvent(request, signed);
      expect(res.ok(), await res.text()).toBe(true);
    };
    await submit(await createSignedAccountEvent(alice));
    const moduleName = `tree_${suffix}`;
    await submit(
      await createSignedSingleModuleCommitEvent({
        credentials: alice,
        moduleName,
        branch: "main",
        moduleDescription: [],
        message: "first",
        parentCommitHash: null,
        parts: [
          {
            name: "one",
            description: [],
            partType: { "#type_number": null },
            expression: { "#number": 1 },
          },
        ],
      }),
    );
    await page.addInitScript((account) => {
      localStorage.setItem("definy.account.v1", JSON.stringify(account));
    }, alice);
    // プロジェクトの木は左端のメニューの「プロジェクト」の欄 (イベントのページではイベントの一覧になる)
    await page.goto("/modules");

    // プロジェクト ▸ ブランチ ▸ コミット ▸ モジュール ▸ パーツ. 表示しているブランチは開いている
    // (プロジェクト名は省くとモジュール名と同じ. src/test_commit.ts)
    const projectGroup = page.locator(
      `.sidebar-project-group[data-project="${moduleName}"]`,
    );
    await expect(projectGroup).toBeVisible({ timeout: 15000 });
    await expect(projectGroup.locator(".branch-node")).toContainText("main");
    await expect(projectGroup.locator(".commit-node")).toContainText("first");
    const partNode = projectGroup.locator(".sidebar-tree-node.part-node", {
      hasText: /^one$/,
    });
    await expect(partNode).toBeVisible();

    // スクロールしても上の段の行は上端に残る (VSCode の sticky scroll)
    await expect(
      projectGroup.locator(".sidebar-tree-row", {
        has: page.locator(".module-node"),
      }),
    ).toHaveCSS("position", "sticky");

    // 左の › で開閉し, 名前はその段のページへのリンク
    const moduleRow = projectGroup.locator(".sidebar-tree-row", {
      has: page.locator(".module-node"),
    });
    await moduleRow.locator(".sidebar-tree-toggle").click();
    await expect(partNode).toHaveCount(0);
    await moduleRow.locator(".sidebar-tree-toggle").click();
    await expect(partNode).toBeVisible();
    await moduleRow.locator(".module-node").click();
    await page.waitForURL(new RegExp(`/module/${moduleName}`));
    // 開いているページの行はパーツと同じく強調する
    await expect(moduleRow.locator(".module-node")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await projectGroup.locator(".commit-node").click();
    await page.waitForURL(/\/event\//);
    await expect(projectGroup.locator(".commit-node")).toHaveAttribute(
      "aria-current",
      "page",
    );

    // 「ブランチの追加」でプロジェクトのページの新しいブランチの欄を開いて作る
    await projectGroup.locator('[data-add="branch"]').click();
    await page.waitForURL(/add=branch/);
    await page.locator("#new-branch-name").fill("feature");
    await page.locator(".new-branch-form button[type='submit']").click();
    await expect(page.locator("#project-branch-select")).toHaveValue(
      "feature",
      { timeout: 15000 },
    );
    await expect(
      projectGroup.locator(".branch-node", { hasText: "feature" }),
    ).toBeVisible();

    // 左端のメニューでサイドバーの欄が変わる: イベント → イベント一覧, アカウント一覧 → アカウント一覧, 設定 → 空
    await page.locator('.activity-item[href^="/accounts"]').click();
    await page.waitForURL(/\/accounts/);
    await expect(page.locator(".sidebar-project-group")).toHaveCount(0);
    await expect(
      page.locator(".sidebar-account-node", { hasText: alice.accountName }),
    ).toBeVisible();
    await page.locator(".activity-item").first().click();
    await expect(page.locator(".sidebar-event-node").first()).toBeVisible();
    await page.locator(".sidebar-event-node").first().click();
    await page.waitForURL(/\/event\//);
    await expect(
      page.locator(".sidebar-event-node[aria-current='page']"),
    ).toHaveCount(1);
    await page.locator('.activity-item[href^="/settings"]').click();
    await page.waitForURL(/\/settings/);
    await expect(page.locator(".sidebar-scroll")).toBeEmpty();
  });

  test("settings lists secrets with masked values", async ({ page }) => {
    await page.goto("/settings");
    await page.evaluate(() => {
      localStorage.setItem(
        "definy.secrets",
        JSON.stringify({
          "cloudflare-api-token-6c1f0e3a9b2d4c58": {
            value: "sk-e2e-secret-value",
            label: "Cloudflare API トークン",
            allowedUrlPrefixes: ["https://api.cloudflare.com/"],
            updatedAt: "2026-10-29T21:00:00.000Z",
          },
        }),
      );
    });
    await page.locator('a[href^="/settings/secrets"]').click();
    await page.waitForURL(/\/settings\/secrets/);
    const item = page.locator(".secret-list-item", {
      hasText: "cloudflare-api-token-6c1f0e3a9b2d4c58",
    });
    await expect(
      item.locator('a[href^="/part/"]', {
        hasText: "definy.cloudflare-api-token",
      }),
    ).toBeVisible({ timeout: 15000 });
    // 値はふだん隠し, 「表示」で出す
    await expect(item).not.toContainText("sk-e2e-secret-value");
    await item.getByRole("button", { name: "Show" }).click();
    await expect(item).toContainText("sk-e2e-secret-value");
    await item.getByRole("button", { name: "Delete value" }).click();
    await expect(item).toContainText("Not entered");
  });

  test("part page shows loading and not-found instead of an editable placeholder (#764)", async ({
    page,
  }) => {
    await page.goto("/part/core.no-such-part");
    await expect(page.getByText("Part not found")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(".part-definition-tree")).toHaveCount(0);
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
    const breadcrumb = page.locator(
      '.hierarchy-segment[aria-current="page"] .hierarchy-name',
    );
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb).toHaveText("triangle-area");

    // 「式を評価」ボタンは無く, 実行は実行パネルでする
    await expect(
      page.locator(".part-actions button", {
        hasText: /Evaluate Expression|式を評価|Taksi esprimon/,
      }),
    ).toHaveCount(0);
  });

  test("parts page shows new and deleted parts and filters to changes only", async ({
    page,
  }) => {
    await page.goto("/parts?lang=en");
    await page.evaluate(() => {
      const part = {
        moduleDefinitionEventHash: "sample",
        description: [],
        partType: { "#type_number": null },
        expression: { "#number": 1 },
      };
      localStorage.setItem(
        "definy.working_changes.v5",
        JSON.stringify({
          parts: {
            "sample.e2e-new": {
              ...part,
              partDefinitionEventHash: "sample.e2e-new",
              name: "e2e-new",
            },
            "sample.triangle-area": {
              ...part,
              partDefinitionEventHash: "sample.triangle-area",
              name: "triangle-area",
              deleted: true,
            },
          },
        }),
      );
    });
    await page.reload();

    // 一覧にはコミット前の新しいパーツも出て, 削除したパーツは取り消し線で出る
    const newCard = page.locator(".part-card", { hasText: "e2e-new" });
    await expect(newCard).toHaveAttribute("data-status", "new", {
      timeout: 15000,
    });
    const deletedCard = page.locator(".part-card", {
      hasText: "triangle-area",
    });
    await expect(deletedCard).toHaveAttribute("data-status", "deleted");
    await expect(deletedCard.locator(".part-breadcrumb")).toHaveCSS(
      "text-decoration-line",
      "line-through",
    );

    // 「変更のみ表示」で変更だけになり, そこからコミットできる
    const toggle = page.locator(".changes-only-toggle");
    await expect(toggle).toContainText("2");
    await toggle.click();
    await expect(page).toHaveURL(/changes=only/);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".change-card")).toHaveCount(2);
    await expect(page.locator(".part-grid")).toHaveCount(0);
    await expect(page.locator(".commit-panel")).toBeVisible();
    await toggle.click();
    await expect(page.locator(".part-grid")).toBeVisible();
    await page.evaluate(() => {
      localStorage.removeItem("definy.working_changes.v5");
    });
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

    // 実行パネルを開き, 開いているパーツを入力して実行すると stage1.wasm による結果が 25 になる
    const runPanel = page.locator(".run-panel");
    await expect(runPanel).toBeHidden();
    await page.locator(".run-panel-toggle").click();
    await expect(runPanel).toBeVisible();
    await runPanel.locator(".run-panel-use-part").click();
    await runPanel.locator(".run-panel-run").click();

    const entry = runPanel.locator(".run-history-entry").first();
    await expect(entry).toHaveAttribute("data-outcome", "value", {
      timeout: 15000,
    });
    await expect(entry.locator(".run-history-output")).toHaveText("25");

    // 再実行すると履歴に新しい記録が足される. パネルはページを移っても出したまま
    await entry.locator(".run-history-rerun").click();
    await expect(runPanel.locator(".run-history-entry")).toHaveCount(2);
    await expect(
      runPanel
        .locator(".run-history-entry")
        .first()
        .locator(".run-history-output"),
    ).toHaveText("25", { timeout: 15000 });
    await page
      .locator(".activity-item", { hasText: /Accounts|アカウント/ })
      .first()
      .click();
    await page.waitForURL(/\/accounts/);
    await expect(runPanel).toBeVisible();
  });

  test("run panel shows the result value as an expression tree", async ({
    page,
  }) => {
    await page.goto("/part/sample.prime-numbers");
    await expect(page.locator(".part-definition-tree")).toBeVisible({
      timeout: 15000,
    });
    const runPanel = page.locator(".run-panel");
    await page.locator(".run-panel-toggle").click();
    await runPanel.locator(".run-panel-use-part").click();
    await runPanel.locator(".run-panel-run").click();

    // 結果のリストは JSON の文字列ではなく, 入力と同じ式のツリーで出す (#801)
    const entry = runPanel.locator(".run-history-entry").first();
    await expect(entry).toHaveAttribute("data-outcome", "value", {
      timeout: 15000,
    });
    const value = entry.locator(".run-history-value");
    await expect(value.locator(".expression-tree-container")).toBeVisible();
    await expect(
      value.locator(".tree-badge", { hasText: "2" }).first(),
    ).toBeVisible();
    await expect(value).not.toContainText("[");
  });

  test("run panel shows a NaN result as core.float-nan", async ({ page }) => {
    await page.goto("/part/core.float-nan");
    await expect(page.locator(".part-definition-tree")).toBeVisible({
      timeout: 15000,
    });
    const runPanel = page.locator(".run-panel");
    await page.locator(".run-panel-toggle").click();
    await runPanel.locator(".run-panel-use-part").click();
    await runPanel.locator(".run-panel-run").click();

    const entry = runPanel.locator(".run-history-entry").first();
    await expect(entry).toHaveAttribute("data-outcome", "value", {
      timeout: 15000,
    });
    await expect(entry.locator(".run-history-value")).toHaveText(
      "core.float-nan",
    );
  });

  test("run panel rebuilds the compiler from the shown core parts and runs with it", async ({
    page,
  }) => {
    await page.goto("/part/sample.triangle-area");
    await expect(page.locator(".part-definition-tree")).toBeVisible({
      timeout: 15000,
    });
    const runPanel = page.locator(".run-panel");
    await page.locator(".run-panel-toggle").click();
    await expect(runPanel).toBeVisible();
    const current = runPanel.locator(".compiler-rebuild-current");
    await expect(current).toHaveAttribute("data-rebuilt", "false");

    // 表示中の core.compile-to-wasm を stage1 でコンパイルし直し, 不動点のコンパイラを使う
    await runPanel.locator(".compiler-rebuild-button").click();
    await expect(current).toHaveAttribute("data-rebuilt", "true", {
      timeout: 60000,
    });
    await expect(runPanel.locator(".compiler-rebuild-status")).toHaveText(
      /fixed point|不動点/,
    );

    // 作り直したコンパイラで実行できる
    await runPanel.locator(".run-panel-use-part").click();
    await runPanel.locator(".run-panel-run").click();
    const entry = runPanel.locator(".run-history-entry").first();
    await expect(entry).toHaveAttribute("data-outcome", "value", {
      timeout: 15000,
    });
    await expect(entry.locator(".run-history-output")).toHaveText("25");

    // 作り直したコンパイラは再読み込みしても使い, 同梱のものに戻せる
    await page.reload();
    await expect(page.locator(".part-definition-tree")).toBeVisible({
      timeout: 15000,
    });
    await page.locator(".run-panel-toggle").click();
    await expect(runPanel).toBeVisible();
    await expect(current).toHaveAttribute("data-rebuilt", "true");
    await runPanel.locator(".compiler-rebuild-reset").click();
    await expect(current).toHaveAttribute("data-rebuilt", "false");
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

    // 式の根の関数の引数名 x を選ぶとその場で名前を変えられ, 本体の変数の表示も変わる
    const parameter = page
      .locator("#part-def-value-tree .tree-badge", { hasText: /^x$/ })
      .first();
    await parameter.click();
    const input = valueTree.locator(".tree-badge input[type=text]");
    await expect(input).toBeVisible();
    await input.fill("value");
    // 本体の 3 か所の変数 (引数名の入力欄は文字を持たない)
    await expect(
      page.locator("#part-def-value-tree .tree-badge", { hasText: /^value$/ }),
    ).toHaveCount(3);
    // パーツの型の引数名も合わせて変わる
    await expect(
      page.locator("#part-def-type-tree .tree-badge", { hasText: /^value$/ }),
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
    // (パーツの型の行の f の引数名 item は名前の欄なので数えない)
    await expect(
      page.locator("#part-def-value-tree .tree-badge", { hasText: /^item:$/ }),
    ).toHaveCount(2);
  });

  test("expression tree editor shows the inferred type argument in an empty slot and fixes it with Enter", async ({
    page,
  }) => {
    await page.goto("/part/core.list-map");
    const valueTree = page.locator("#part-def-value-tree");
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    // core.list-map-inner(T: T, ...) の型引数 T を消して未入力にする
    const typeArgument = valueTree
      .locator(".tree-capsule", {
        has: page.locator(".tree-badge", { hasText: /^T:$/ }),
      })
      .last()
      .locator(".tree-badge", { hasText: /^T$/ });
    await typeArgument.click();
    await page.locator(".dropdown-search-input").fill("");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Escape");
    // xs: List<T> の xs の型から T と推論して, 未入力の枠に薄く出す
    const hint = valueTree.locator(".tree-hole-hint", { hasText: /^T$/ });
    await expect(hint).toBeVisible({ timeout: 15000 });

    // 置換メニューの先頭が推論した型で, そのまま Enter で確定する
    await hint.click();
    await expect(page.locator(".dropdown-option").first()).toContainText(
      "inferred",
    );
    await page.keyboard.press("Enter");
    await expect(hint).toHaveCount(0);
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^□$/ }),
    ).toHaveCount(0);
  });

  test("selecting a part at a function-typed argument wraps it in a lambda", async ({
    page,
  }) => {
    await page.goto("/part/core.list-map");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    // core.list-map-inner の f: に書いたラムダ式 (item) => f(item: item) を選び, std.abs に置き換える
    await valueTree.locator(".tree-badge", { hasText: /^fn$/ }).last().click();
    await page.locator(".dropdown-search-input").fill("std.abs");
    await page
      .locator(".dropdown-option", { hasText: /^std\.abs(?!-)/ })
      .first()
      .click();
    // 関数は値として書けないので, ラムダ式の引数を渡す std.abs の呼び出しをラムダ式の本体にする
    await expect(
      valueTree.locator('[data-node-id$=".fn"]', { hasText: /^std\.abs$/ }),
    ).toHaveCount(1);
    await expect(
      page.locator("#part-def-value-tree .tree-badge", { hasText: /^item$/ }),
    ).toHaveCount(2);
    await expect(valueTree.locator(".tree-type-error")).toHaveCount(0);
  });

  test("selecting a part with a function-typed parameter fills it with a lambda", async ({
    page,
  }) => {
    await page.goto("/part/std.abs");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    // core.minus(left: 0, right: x) の呼び出しを core.list-map に置き換える
    await valueTree
      .locator(".tree-badge", { hasText: /^core\.minus$/ })
      .click();
    await page.locator(".dropdown-search-input").fill("core.list-map");
    await page
      .locator(".dropdown-option", { hasText: /^core\.list-map(?!-)/ })
      .first()
      .click();
    // 型引数 T: と U:, xs: は未入力, f: は本体が未入力のラムダ式 (item) => □
    await expect(
      valueTree.locator('[data-node-id$=".fn"]', {
        hasText: /^core\.list-map$/,
      }),
    ).toHaveCount(1);
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^item$/ }),
    ).toHaveCount(1);
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^□$/ }),
    ).toHaveCount(4);
    // 型引数の位置では型の式を選べる (期待する型が type なので, 型の number を数値の number より先に出す)
    const numberBadges = valueTree.locator(".tree-badge", {
      hasText: /^number$/,
    });
    const numberBadgesBefore = await numberBadges.count();
    await valueTree.locator(".tree-badge", { hasText: /^□$/ }).first().click();
    await page.locator(".dropdown-search-input").fill("number");
    await expect(
      page.locator(".dropdown-option", { hasText: /^number/ }),
    ).toHaveCount(2);
    await page
      .locator(".dropdown-option", { hasText: /^number/ })
      .first()
      .click();
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^□$/ }),
    ).toHaveCount(3);
    await expect(numberBadges).toHaveCount(numberBadgesBefore + 1);
  });

  test("renaming a function parameter renames the arguments of the callers in other parts", async ({
    page,
  }) => {
    await page.goto("/part/std.url-path");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    await page
      .locator("#part-def-value-tree .tree-badge", { hasText: /^url$/ })
      .first()
      .click();
    const input = valueTree.locator(".tree-badge input[type=text]");
    await expect(input).toBeVisible();
    await input.fill("address");
    await expect(
      page.locator("#part-def-type-tree .tree-badge", {
        hasText: /^address$/,
      }),
    ).toHaveCount(1);

    // std.url-path を呼び出している sample.self-hosted-definy-server の引数名も変わる (std.url-query の url: はそのまま)
    await page.goto("/part/sample.self-hosted-definy-server");
    const callerTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(callerTree).toBeVisible({ timeout: 15000 });
    await expect(
      callCapsule(callerTree, "std.url-path").locator(".tree-badge", {
        hasText: /^address:$/,
      }),
    ).toHaveCount(1);
    await expect(
      callCapsule(callerTree, "std.url-query").locator(".tree-badge", {
        hasText: /^url:$/,
      }),
    ).toHaveCount(1);
  });

  test("adds and deletes function parameters, keeping the part type and the callers in sync", async ({
    page,
  }) => {
    const option = (name: string) =>
      page
        .locator(".dropdown-option", {
          has: page.locator(".dropdown-option-name", {
            hasText: new RegExp(`^${name}$`),
          }),
        })
        .locator("button");
    const typeTree = page.locator("#part-def-type-tree");
    const valueTree = page.locator("#part-def-value-tree");
    const callerArguments = async () => {
      await page.goto("/part/sample.self-hosted-definy-server");
      const callerTree = page.locator("#part-def-value-tree");
      await expect(callerTree).toBeVisible({ timeout: 15000 });
      return callCapsule(callerTree, "std.url-path");
    };

    // 式の根の関数に引数を足すと, パーツの型にも同じ名前の number 型の引数が増える
    await page.goto("/part/std.url-path");
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    await valueTree.locator(".tree-badge", { hasText: /^fn$/ }).click();
    await option("add-parameter").click();
    await expect(
      typeTree.locator(".tree-badge", { hasText: /^x$/ }),
    ).toHaveCount(1);
    // 呼び出し側には未入力の引数が増える
    await expect(
      (await callerArguments()).locator(".tree-badge", { hasText: /^x:$/ }),
    ).toHaveCount(1);

    // 型の関数の引数名はその場で変えられ, 式の引数名と呼び出し側も変わる
    await page.goto("/part/std.url-path");
    await expect(typeTree).toBeVisible({ timeout: 15000 });
    await typeTree.locator(".tree-badge", { hasText: /^x$/ }).click();
    const input = typeTree.locator(".tree-badge input[type=text]");
    await expect(input).toBeVisible();
    await input.fill("base");
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^base$/ }),
    ).toHaveCount(1);
    await expect(
      (await callerArguments()).locator(".tree-badge", {
        hasText: /^base:$/,
      }),
    ).toHaveCount(1);

    // 型の関数から引数を消すと, 式の引数と呼び出し側の引数も消える
    await page.goto("/part/std.url-path");
    await expect(typeTree).toBeVisible({ timeout: 15000 });
    await typeTree.locator(".tree-badge", { hasText: /^function$/ }).click();
    await option("delete-parameter base").click();
    await expect(
      valueTree.locator(".tree-badge", { hasText: /^base$/ }),
    ).toHaveCount(0);
    const caller = await callerArguments();
    await expect(
      caller.locator(".tree-badge", { hasText: /^base:$/ }),
    ).toHaveCount(0);
    await expect(
      caller.locator(".tree-badge", { hasText: /^url:$/ }),
    ).toHaveCount(1);
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
    // 型は式と同じツリー表示エンジンで描く
    await expect(
      card.locator(".tree-hover-card-type .type-tree-view .tree-badge"),
    ).toHaveText("number");

    // 変数は名前と型 (definy 製の型チェッカーが推論した型)
    await page
      .locator("#part-def-value-tree .tree-badge", { hasText: /^x$/ })
      .nth(1)
      .hover();
    await expect(card.locator(".tree-hover-card-title")).toContainText("x");
    await expect(card.locator(".tree-hover-card-type")).toContainText("number");

    // カードは top layer に出すので, ツリーの枠の中にスクロールバーを出さず, 画面の中に収まる
    const container = page.locator("#part-def-value-tree");
    expect(
      await container.evaluate(
        (element) => element.scrollHeight <= element.clientHeight,
      ),
    ).toBe(true);
    const cardBox = await card.boundingBox();
    const viewport = page.viewportSize();
    expect(cardBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (cardBox !== null && viewport !== null) {
      expect(cardBox.y).toBeGreaterThanOrEqual(0);
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(viewport.height);
    }

    // 置換メニューを開いている間は出さない. メニューには期待する型をツリーで出す
    await page
      .locator("#part-def-value-tree .tree-badge", { hasText: /^x$/ })
      .nth(1)
      .click();
    await expect(card).toHaveCount(0);
    await expect(
      page.locator(".dropdown-expected-type .type-tree-view"),
    ).toHaveText("number");
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
    await option("delete-arm").locator("button").first().click();
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

    // Ctrl + クリックでも移動できる. Ctrl を押しながらホバーすると下線が付く
    await page.keyboard.down("Control");
    await badge("width").last().hover();
    await expect(badge("width").last()).toHaveAttribute("data-link", "true");
    await badge("width")
      .last()
      .click({ modifiers: ["Control"] });
    await page.keyboard.up("Control");
    await expect(selected).toHaveText("width");
    await expect(page.locator(".dropdown-search-input")).toHaveCount(0);
  });

  test("expression tree editor shows and edits line breaks in text literals (#800)", async ({
    page,
  }) => {
    await page.goto("/part/sample.greet");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    await valueTree
      .locator(".tree-badge", { hasText: /^"Hello, "$/ })
      .first()
      .click();
    const textarea = valueTree.locator(".tree-badge textarea");
    await expect(textarea).toBeVisible();
    // Shift + Enter で改行する. 複数行になって入力欄が作り直されても続けて入力できる
    await page.keyboard.type("Hello,");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("  world");
    await expect(textarea).toHaveValue("Hello,\n  world");
    await page.keyboard.press("Enter");
    await expect(textarea).toHaveCount(0);
    // 改行・行頭の空白をそのまま見せる
    const badge = valueTree.locator(".tree-badge", { hasText: "world" });
    expect(await badge.innerText()).toBe('"Hello,\n  world"');
  });

  test("expression tree editor opens the referenced part with Ctrl + click", async ({
    page,
  }) => {
    await page.goto("/part/sample.match-option-sample");
    const valueTree = page
      .locator("#part-definition-value-tree, .part-definition-tree")
      .first();
    await expect(valueTree).toBeVisible({ timeout: 15000 });
    const plus = valueTree.locator(".tree-badge", { hasText: /^core\.plus$/ });
    await expect(plus).toHaveCount(1);

    // 普通のクリックは選ぶだけ (ページは移動しない)
    await plus.click();
    await expect(page).toHaveURL(/\/part\/sample\.match-option-sample/);
    await page.keyboard.press("Escape");

    // Ctrl + クリックで呼び出しているパーツ core.plus の詳細ページへ移動する
    await plus.click({ modifiers: ["Control"] });
    await expect(page).not.toHaveURL(/match-option-sample/);
    await expect(page).toHaveURL(/\/part\//);
    await expect(page).toHaveTitle(/plus/);
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
      expression: { "#number": 5 },
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

  test("keyboard shortcut list opens with Ctrl+/ and from the command palette", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector(".event-card");

    // Ctrl+/ で開閉できる
    const shortcutList = page.locator(".shortcut-list");
    await page.keyboard.press("Control+/");
    await expect(shortcutList).toBeVisible();
    await expect(
      shortcutList.locator('[data-shortcut="command-palette"]'),
    ).toContainText("P");
    await expect(
      shortcutList.locator('[data-shortcut-group="tree"]'),
    ).toBeVisible();
    await page.keyboard.press("Control+/");
    await expect(shortcutList).not.toBeVisible();

    // 画面上部の検索 (コマンドパレット) からも開ける
    await page.locator(".header-title").click();
    const palette = page.locator(".command-palette");
    const paletteInput = palette.locator(".command-palette-input input");
    await paletteInput.fill("shortcut");
    await expect(
      palette.locator(".command-palette-item").first(),
    ).toContainText(/Keyboard Shortcuts|ショートカットキー一覧|Klavkombinoj/);
    await paletteInput.press("Enter");
    await expect(palette).not.toBeVisible();
    await expect(shortcutList).toBeVisible();

    // Escape で閉じる
    await page.keyboard.press("Escape");
    await expect(shortcutList).not.toBeVisible();
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

    // 7. Test commit flow: stage a working change and commit from /parts?changes=only
    await page.evaluate(() => {
      const changes = {
        parts: {
          "sample.e2e-part": {
            moduleDefinitionEventHash: "sample",
            partDefinitionEventHash: "sample.e2e-part",
            name: "e2e-part",
            description: [{ language: "en", text: "Part created in E2E test" }],
            partType: { "#type_number": null },
            expression: { "#number": 999 },
          },
        },
      };
      localStorage.setItem(
        "definy.working_changes.v5",
        JSON.stringify(changes),
      );
    });

    await page.goto("/parts?changes=only");
    const changeCard = page.locator(".change-card", { hasText: "e2e-part" });
    await expect(changeCard).toBeVisible({ timeout: 10000 });

    // sample の main は system アカウントのブランチなので, 自分の名前の新しいブランチを作ってコミットする (docs/branch.md)
    const branchInput = page.locator("input#commit-branch-input");
    await expect(branchInput).toHaveValue(accountName);

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

    // コミットしたブランチを表示する. main に切り替えると e2e-part は無い
    // ブランチはプロジェクトのページで切り替え, パーツはモジュールのページで見る
    await page.goto("/project/sample");
    const branchSelect = page.locator("#project-branch-select");
    await expect(branchSelect).toHaveValue(accountName, { timeout: 10000 });
    await expect(
      page.locator(".module-commit-message", {
        hasText: "Add e2e-part via test",
      }),
    ).toBeVisible();
    const partGrid = page.locator(".part-grid");
    await page.goto("/module/sample");
    await expect(
      partGrid.locator(".part-card", { hasText: "e2e-part" }),
    ).toBeVisible({ timeout: 10000 });
    await page.goto("/project/sample");
    await expect(branchSelect).toHaveValue(accountName, { timeout: 10000 });
    await branchSelect.selectOption("main");
    await page.goto("/module/sample");
    await expect(page.locator(".part-grid .part-card").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(
      partGrid.locator(".part-card", { hasText: "e2e-part" }),
    ).toHaveCount(0);
    await page.goto("/project/sample");
    await expect(branchSelect).toHaveValue("main", { timeout: 10000 });
    await branchSelect.selectOption(accountName);

    // 自分のブランチを表示していれば, 次のコミットはそのブランチに
    await page.evaluate(() => {
      localStorage.setItem(
        "definy.working_changes.v5",
        JSON.stringify({
          parts: {
            "sample.e2e-part": {
              moduleDefinitionEventHash: "sample",
              partDefinitionEventHash: "sample.e2e-part",
              name: "e2e-part",
              description: [],
              partType: { "#type_number": null },
              expression: { "#number": 1000 },
            },
          },
        }),
      );
    });
    await page.goto("/parts?changes=only");
    await expect(page.locator("p#commit-branch-input")).toContainText(
      accountName,
    );
    await messageInput.fill("Update e2e-part");
    await commitBtn.click();
    await expect(commitSuccess).toBeVisible({ timeout: 10000 });
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
