import { expect, test } from "@playwright/test";
import {
  createSignedAccountEvent,
  generateAccountCredentials,
  type SignedEventResult,
  type SignedProjectCommitResult,
} from "../src/auth.ts";
import { createSignedSingleModuleCommitEvent } from "../src/test_commit.ts";

/**
 * サーバーが鎖の途中のコミットを返さない (消した) とき, プロジェクトのページのコミット履歴は
 * 黙って途切れずに, 親のコミットが無いことを出す (docs/event.md「消されたことに気づけるか」)
 */
test("project history shows a row when the parent commit is not on the server", async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString().slice(-6);
  const alice = await generateAccountCredentials(`alice_x${suffix}`);
  const submit = async (
    signed: SignedEventResult | SignedProjectCommitResult,
  ): Promise<string> => {
    if ("contents" in signed) {
      const uploaded = await request.post(
        "/definy.v1.EventService/UploadContent",
        { data: { items: [...signed.contents.values()] } },
      );
      expect(uploaded.ok(), await uploaded.text()).toBe(true);
    }
    const res = await request.post("/definy.v1.EventService/SubmitEvent", {
      data: { signedEventBytes: signed.signedEventBytes },
    });
    expect(res.ok(), await res.text()).toBe(true);
    return ((await res.json()) as { readonly eventHash: string }).eventHash;
  };
  await submit(await createSignedAccountEvent(alice));
  const moduleName = `gone_${suffix}`;
  let time = Math.floor(Date.now() / 1000) - 60;
  const commit = async (
    message: string,
    parentCommitHash: string | null,
  ): Promise<string> =>
    submit(
      await createSignedSingleModuleCommitEvent(
        {
          credentials: alice,
          moduleName,
          branch: "main",
          moduleDescription: [],
          message,
          parentCommitHash,
          parts: [
            {
              name: "one",
              description: [],
              partType: { "#type_number": null },
              expression: { "#number": 1 },
            },
          ],
        },
        (time += 1),
      ),
    );
  const first = await commit("first", null);
  await commit("second", first);

  // サーバーが最初のコミットを消したように見せる: 一覧から外し, GetEvent でも返さない
  await page.route("**/definy.v1.EventService/GetEvents", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      readonly events?: ReadonlyArray<{ readonly eventHash: string }>;
    };
    await route.fulfill({
      response,
      json: {
        ...body,
        events: (body.events ?? []).filter((e) => e.eventHash !== first),
      },
    });
  });
  await page.route("**/definy.v1.EventService/GetEvent", async (route) => {
    const { eventHash } = route.request().postDataJSON() as {
      readonly eventHash: string;
    };
    if (eventHash === first) {
      await route.fulfill({ json: {} });
      return;
    }
    await route.continue();
  });

  // プロジェクト名は省くとモジュール名と同じ (src/test_commit.ts)
  await page.goto(`/project/${moduleName}?lang=en`);
  const commits = page.locator(".module-commit-list");
  await expect(
    commits.locator(".module-commit", { hasText: "second" }),
  ).toBeVisible({ timeout: 15000 });
  const missing = commits.locator(".module-commit-missing");
  await expect(missing).toBeVisible();
  await expect(missing).toContainText(first.slice(0, 8));
  await expect(missing).toContainText("not on this server");
  await expect(
    commits.locator(".module-commit", { hasText: "first" }),
  ).toHaveCount(0);
});
