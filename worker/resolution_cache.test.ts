/**
 * 解決キャッシュ (段階2) の振る舞いのテスト:
 * - 即時解決できるパーツは提出後にホストの解決キャッシュへ保存される
 * - 評価が要るパーツ (保留→評価で解決するもの) は保存されず、
 *   参照先が変われば結果も変わる (古い結果が返らない)
 */
import { describe, expect, it } from "vitest";
import {
  generateAccountCredentials,
  type AccountCredentials,
} from "../src/auth.ts";
import { partDefinitionExpression } from "../src/part_definition.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "../src/part_ids.ts";
import { WorkerStore, handleWorkerRequest } from "./index.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import { DefinyClient } from "../mcp/definy_client.ts";
import type { Env } from "./types.ts";
import type { DecodedPart } from "../src/decoded_event.ts";

const setup = async (): Promise<{
  client: DefinyClient;
  credentials: AccountCredentials;
  db: ReturnType<typeof createSqliteD1Database>;
}> => {
  const store = new WorkerStore();
  const db = createSqliteD1Database();
  await store.seedD1(db, await loadTestSeedBundle());
  const env: Env = { DB: db };
  const fetchFn = (async (input: string, init?: RequestInit) => {
    const path = String(input).replace(/^https:\/\/example\.test/, "");
    return handleWorkerRequest(
      new Request(`https://definy.local${path}`, init),
      env,
      store,
    );
  }) as typeof fetch;
  const client = new DefinyClient({ baseUrl: "https://example.test", fetchFn });
  const credentials = await generateAccountCredentials("cache-tester");
  await client.submitAccountCreation(credentials);
  return { client, credentials, db };
};

const cachedHashes = async (
  db: ReturnType<typeof createSqliteD1Database>,
): Promise<ReadonlyArray<string>> => {
  const res = await db
    .prepare("SELECT content_hash FROM host_resolution_cache")
    .all<{ content_hash: string }>()
    .catch(() => ({ results: [] as Array<{ content_hash: string }> }));
  return res.results.map((r) => r.content_hash);
};

/** base の値で中身が変わる、評価が要るパーツ answer の定義 */
const dynamicAnswerDefinition = (projectName: string): unknown => {
  const partRef = (id: string): unknown => ({
    "#part_reference": { part_definition_event_hash: id },
  });
  const defineWith = (value: number): unknown =>
    partDefinitionExpression({
      description: [],
      visibility: "public",
      partType: { "#type_number": null },
      expression: { "#number": value },
    });
  const defineString = partDefinitionExpression({
    description: [],
    visibility: "public",
    partType: { "#type_string": null },
    expression: { "#string": "changed" },
  });
  return {
    "#match": {
      target: {
        "#call": {
          function: partRef(
            deriveModulePartId(deriveModuleIdBytes("core"), "equal"),
          ),
          arguments: [
            {
              name: "left",
              value: partRef(
                deriveModulePartId(deriveModuleIdBytes(projectName), "base"),
              ),
            },
            { name: "right", value: { "#number": 1 } },
          ],
        },
      },
      arms: [
        { pattern: { "#boolean": true }, body: defineWith(42) },
        { pattern: { "#boolean": false }, body: defineString },
      ],
    },
  };
};

describe("解決キャッシュ", () => {
  it("即時解決のパーツだけが保存され、評価が要るパーツは参照先の変化に追随する", async () => {
    const { client, credentials, db } = await setup();
    const project = "dynproj";
    const basePart = (value: number): DecodedPart => ({
      name: "base",
      description: [],
      partType: { "#type_number": null },
      expression: { "#number": value },
    });
    const answerPart = (): DecodedPart =>
      ({
        name: "answer",
        description: [],
        partType: { "#type_number": null },
        expression: null,
        definition: dynamicAnswerDefinition(project),
      }) as DecodedPart;
    const usePart = (): DecodedPart => ({
      name: "use",
      description: [],
      partType: { "#type_number": null },
      expression: {
        "#part_reference": {
          part_definition_event_hash: deriveModulePartId(
            deriveModuleIdBytes(project),
            "answer",
          ),
        },
      },
    });

    const first = await client.submitCommit({
      credentials,
      projectName: project,
      branch: "main",
      projectDescription: [],
      message: "base=1",
      parentCommitHash: null,
      modules: [
        {
          name: project,
          description: [],
          parts: [basePart(1), answerPart(), usePart()],
        },
      ],
    });
    expect(first.status).toBe("accepted");

    const snapshot1 = (await client.getProjectSnapshot(project))!;
    const answer1 = snapshot1.modules[0]?.parts.find(
      (p) => p.name === "answer",
    );
    const base1 = snapshot1.modules[0]?.parts.find((p) => p.name === "base");

    // 即時解決できた base はキャッシュされ、評価が要った answer は保存されない
    const hashes = await cachedHashes(db);
    expect(base1?.contentHash).toBeDefined();
    expect(hashes).toContain(base1?.contentHash);
    expect(hashes).not.toContain(answer1?.contentHash);

    // base を変える (answer の定義 = content hash は不変)。
    // answer は string のパーツとして解決し直されるので、
    // number として使う use が型エラーになり、コミットは拒否されるはず。
    // 解決キャッシュが古い answer (number) を返していたら受理されてしまう
    await expect(
      client.submitCommit({
        credentials,
        projectName: project,
        branch: "main",
        projectDescription: [],
        message: "base=2",
        parentCommitHash: first.eventHash,
        modules: [
          {
            name: project,
            description: [],
            parts: [basePart(2), answerPart(), usePart()],
          },
        ],
      }),
    ).rejects.toThrow(/type error/);
    void answer1;
  }, 600_000);

  it("同じ中身が別のモジュールにもあっても、エントリの id は使う側に合う", async () => {
    const { client, credentials } = await setup();
    // m1.x と m2.x は中身が同じ (content hash が同じ)。m2.use は m2.x を参照する。
    // キャッシュされたエントリの part_id が m1 のものになると、2 回目の提出で
    // m2.use の参照が合わなくなる
    const xPart = (): DecodedPart => ({
      name: "x",
      description: [],
      partType: { "#type_number": null },
      expression: { "#number": 42 },
    });
    const usePart = (): DecodedPart => ({
      name: "use",
      description: [],
      partType: { "#type_number": null },
      expression: {
        "#part_reference": {
          part_definition_event_hash: deriveModulePartId(
            deriveModuleIdBytes("m2"),
            "x",
          ),
        },
      },
    });
    const modules = (): Parameters<
      typeof client.submitCommit
    >[0]["modules"] => [
      { name: "m1", description: [], parts: [xPart()] },
      { name: "m2", description: [], parts: [xPart(), usePart()] },
    ];
    const first = await client.submitCommit({
      credentials,
      projectName: "dupproj",
      branch: "main",
      projectDescription: [],
      message: "create",
      parentCommitHash: null,
      modules: modules(),
    });
    expect(first.status).toBe("accepted");
    // キャッシュが温まった状態で同じ内容をもう一度送る
    const second = await client.submitCommit({
      credentials,
      projectName: "dupproj",
      branch: "other",
      projectDescription: [],
      message: "same contents on another branch",
      parentCommitHash: first.eventHash,
      modules: modules(),
    });
    expect(second.status).toBe("accepted");
  }, 600_000);

  it("2 回目の提出ではキャッシュが使われても結果が同じになる", async () => {
    const { client, credentials } = await setup();
    const created = await client.submitCommit({
      credentials,
      projectName: "cacheproj",
      branch: "main",
      projectDescription: [],
      message: "create",
      parentCommitHash: null,
      modules: [
        {
          name: "cacheproj",
          description: [],
          parts: [
            {
              name: "greet",
              description: [],
              partType: { "#type_string": null },
              expression: { "#string": "hi" },
            },
          ],
        },
      ],
    });
    expect(created.status).toBe("accepted");
    // 同じ内容のコミットを別ブランチに送る (解決キャッシュが温かい状態)
    const { createWriteTools } = await import("../mcp/write_tools.ts");
    const tools = new Map(
      createWriteTools(client, credentials).map((t) => [t.name, t]),
    );
    await tools.get("definy_create_branch")!.handler({
      project: "cacheproj",
      branch: "copy",
    });
    const snapshot = (await client.getProjectSnapshot("cacheproj", "copy"))!;
    expect(snapshot.modules[0]?.parts[0]?.content?.expression).toEqual({
      "#string": "hi",
    });
  }, 600_000);
});
