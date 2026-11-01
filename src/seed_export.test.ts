import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createSignedAccountEvent,
  generateAccountCredentials,
  importAccountCredentials,
} from "./auth.ts";
import { base64ToBytes, bytesToUrlSafeBase64NoPad } from "./base64.ts";
import type { DecodedPart } from "./decoded_event.ts";
import type { LocalizedText } from "./event_content.ts";
import { exportSeeds } from "./seed_export.ts";
import {
  DEV_SYSTEM_KEY_SEED,
  resolvePartPlaceholders,
  resolveSeedPartType,
} from "./seed_parts.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import { handleWorkerRequest, WorkerStore } from "../worker/index.ts";
import { createSqliteD1Database } from "../worker/test_helpers.ts";
import { loadTestSeedBundle } from "../worker/test_runtime.ts";
import { latestCommitHashOf } from "../worker/commit_store.ts";
import type { Env, SeedBundle } from "../worker/types.ts";
import { createSignedSingleModuleCommitEvent } from "./test_commit.ts";
import { partContentItem } from "./content_store.ts";

async function createTestServer(bundle: SeedBundle): Promise<{
  readonly store: WorkerStore;
  readonly env: Env;
  readonly mockFetch: typeof fetch;
}> {
  const store = new WorkerStore();
  const d1 = createSqliteD1Database();
  const env: Env = {
    DB: d1,
    ASSETS: {
      fetch(input: Request | URL | string): Promise<Response> {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url.endsWith("/__definy_seed_bundle.json")) {
          return Promise.resolve(
            new Response(JSON.stringify(bundle), { status: 200 }),
          );
        }
        return Promise.resolve(new Response("SPA", { status: 200 }));
      },
    },
  };

  const mockFetch: typeof fetch = (
    input: Request | URL | string,
    init?: RequestInit,
  ) => {
    const req = input instanceof Request ? input : new Request(input, init);
    return handleWorkerRequest(req, env, store);
  };

  return { store, env, mockFetch };
}

describe("exportSeeds", () => {
  it("往復テスト: seed バンドルで初期化したサーバーから書き出した結果が seeds/*.json, seeds/projects/*.json とバイト単位で完全一致する", async () => {
    const seedBundle = await loadTestSeedBundle();
    const { mockFetch } = await createTestServer(seedBundle);
    const tempDir = await mkdtemp(
      join(tmpdir(), "definy-seed-export-roundtrip-"),
    );

    try {
      const exportedModules = await exportSeeds({
        baseUrl: "https://definy.local",
        fetchFn: mockFetch,
        outDir: tempDir,
        seedsDir: "seeds",
      });

      const expectedModules = [
        "definy",
        "core",
        "std",
        "wasi",
        "wasm",
        "sample",
      ];
      expect([...exportedModules].sort()).toEqual([...expectedModules].sort());

      for (const name of expectedModules) {
        const exportedContent = await readFile(
          join(tempDir, `${name}.json`),
          "utf-8",
        );
        const originalContent = await readFile(`seeds/${name}.json`, "utf-8");

        expect(exportedContent).toBe(originalContent);
      }
      for (const name of ["definy", "sample"]) {
        expect(
          await readFile(join(tempDir, "projects", `${name}.json`), "utf-8"),
        ).toBe(await readFile(`seeds/projects/${name}.json`, "utf-8"));
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("編集の反映: システムアカウントの新規コミットが反映され、参照が {$part: ...} に戻り、他アカウントのコミットは無視される", async () => {
    const seedBundle = await loadTestSeedBundle();
    const { store, env, mockFetch } = await createTestServer(seedBundle);
    const tempDir = await mkdtemp(join(tmpdir(), "definy-seed-export-edit-"));

    try {
      const sysCreds = await importAccountCredentials(
        bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED),
        "definy",
      );
      const systemAccountBytes = base64ToBytes(sysCreds.accountId);

      // 他アカウント (攻撃者/一般ユーザー) のコミットを作成
      const attackerCreds = await generateAccountCredentials("attacker");
      const attackerAccountRes = await handleWorkerRequest(
        new Request("https://definy.local/definy.v1.EventService/SubmitEvent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedEventBytes: (await createSignedAccountEvent(attackerCreds))
              .signedEventBytes,
          }),
        }),
        env,
        store,
      );
      expect(attackerAccountRes.status).toBe(200);
      const sampleHead = await latestCommitHashOf("sample", store, env);
      const submitAttackerCommit = async (branch: string): Promise<number> => {
        const attackerCommit = await createSignedSingleModuleCommitEvent({
          credentials: attackerCreds,
          moduleName: "sample",
          branch,
          moduleDescription: [
            { language: "en", text: "Attacker hijacked sample" },
          ],
          message: "Attacker commit should be ignored",
          parentCommitHash: sampleHead,
          parts: [
            {
              name: "malicious-part",
              description: [{ language: "en", text: "Malicious" }],
              partType: { "#type_number": null },
              expression: { "#number": 999 },
            },
          ],
        });
        return (
          await handleWorkerRequest(
            new Request(
              "https://definy.local/definy.v1.EventService/SubmitEvent",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  signedEventBytes: attackerCommit.signedEventBytes,
                }),
              },
            ),
            env,
            store,
          )
        ).status;
      };
      // システムアカウントの main ブランチにはコミットできない (ブランチの作成者だけがコミットできる)
      expect(await submitAttackerCommit("main")).toBe(400);
      // 自分のブランチは作れるが, 書き戻すのは main だけなので無視される
      expect(await submitAttackerCommit("attacker")).toBe(200);

      // sample モジュールの現在のパーツ定義を読み込み、core のパーツを参照する新パーツを追加
      const currentSampleSeed = JSON.parse(
        await readFile("seeds/sample.json", "utf-8"),
      ) as {
        readonly module_description: LocalizedText;
        readonly parts: ReadonlyArray<{
          readonly name: string;
          readonly description?: LocalizedText;
          readonly part_type?: unknown;
          readonly expression?: unknown;
        }>;
      };

      const resolvedExistingParts: ReadonlyArray<DecodedPart> =
        await Promise.all(
          currentSampleSeed.parts.map(async (p) => {
            const partType = await resolveSeedPartType(p.part_type);
            const expression =
              p.expression != null
                ? await resolvePartPlaceholders(p.expression)
                : null;
            return {
              name: p.name,
              description: p.description ?? [],
              partType,
              expression,
            };
          }),
        );

      // core.eval-ast のパーツ ID を導出
      const coreModId = deriveModuleIdBytes("core");
      const coreEvalAstIdStr = deriveModulePartId(coreModId, "eval-ast");

      // 新パーツ: core.eval-ast を呼び出す式
      const newPart: DecodedPart = {
        name: "test-new-sample-part",
        description: [
          { language: "en", text: "New part referencing core.eval-ast" },
        ],
        partType: { "#type_number": null },
        expression: {
          "#call": {
            function: {
              "#part_reference": {
                part_definition_event_hash: coreEvalAstIdStr,
              },
            },
            // 型チェッカーを通るように core.expression の値を渡す
            arguments: [
              {
                name: "e",
                value: {
                  "#variant": {
                    tag: "number",
                    payload: { "#some": { "#number": 1 } },
                    type_part: { "#none": null },
                  },
                },
              },
            ],
          },
        },
      };

      // システムアカウントの新規コミットを作成して投稿
      const systemCommit = await createSignedSingleModuleCommitEvent({
        credentials: sysCreds,
        moduleName: "sample",
        moduleDescription: currentSampleSeed.module_description,
        message: "Add test-new-sample-part referencing core.eval-ast",
        // 親はシステムアカウントの sample の最新のコミット (seed のコミット)
        parentCommitHash: await latestCommitHashOf("sample", store, env),
        parts: [...resolvedExistingParts, newPart],
      });
      await store.uploadContent([...systemCommit.contents.values()], env);

      const systemSubmitRes = await handleWorkerRequest(
        new Request("https://definy.local/definy.v1.EventService/SubmitEvent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedEventBytes: systemCommit.signedEventBytes,
          }),
        }),
        env,
        store,
      );
      expect(systemSubmitRes.status).toBe(200);

      // 書き戻し実行
      const exportedModules = await exportSeeds({
        baseUrl: "https://definy.local",
        fetchFn: mockFetch,
        outDir: tempDir,
        seedsDir: "seeds",
        systemAccountBytes,
      });

      expect(exportedModules).toContain("sample");

      const exportedSampleJson = await readFile(
        join(tempDir, "sample.json"),
        "utf-8",
      );
      const parsedSample = JSON.parse(exportedSampleJson) as {
        readonly parts: ReadonlyArray<{
          readonly name: string;
          readonly expression?: {
            readonly "#call"?: {
              readonly function?: {
                readonly "#part_reference"?: {
                  readonly part_definition_event_hash?: unknown;
                };
              };
            };
          };
        }>;
      };

      // 1. 攻撃者のコミットは無視されている
      expect(parsedSample.parts.some((p) => p.name === "malicious-part")).toBe(
        false,
      );

      // 2. システムアカウントの新規コミットのメッセージがプロジェクトの seed に反映されている
      const parsedProject = JSON.parse(
        await readFile(join(tempDir, "projects", "sample.json"), "utf-8"),
      ) as {
        readonly message: string;
        readonly modules: ReadonlyArray<string>;
      };
      expect(parsedProject.message).toBe(
        "Add test-new-sample-part referencing core.eval-ast",
      );
      expect(parsedProject.modules).toEqual(["sample"]);

      // 3. 新規パーツが存在する
      const foundNewPart = parsedSample.parts.find(
        (p) => p.name === "test-new-sample-part",
      );
      expect(foundNewPart).toBeDefined();

      // 4. パーツ参照が {"$part": "core.eval-ast"} に記号化されている
      const ref =
        foundNewPart?.expression?.["#call"]?.function?.["#part_reference"]
          ?.part_definition_event_hash;
      expect(ref).toEqual({ $part: "core.eval-ast" });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("CAS の中身の復元: content_hash だけを持つパーツの中身が GetContent 経由で復元される", async () => {
    const seedBundle = await loadTestSeedBundle();
    const { store, env, mockFetch } = await createTestServer(seedBundle);
    const tempDir = await mkdtemp(join(tmpdir(), "definy-seed-export-cas-"));

    try {
      const sysCreds = await importAccountCredentials(
        bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED),
        "definy",
      );
      const systemAccountBytes = base64ToBytes(sysCreds.accountId);

      // パーツの中身を CBOR エンコードして CAS にアップロード
      const { contentHash, contentBytes } = partContentItem({
        description: [{ language: "en", text: "Hydrated from CAS" }],
        visibility: "public",
        partType: { "#type_number": null },
        expression: { "#number": 42 },
      });

      const uploadRes = await handleWorkerRequest(
        new Request(
          "https://definy.local/definy.v1.EventService/UploadContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [{ contentHash, contentBytes }],
            }),
          },
        ),
        env,
        store,
      );
      expect(uploadRes.status).toBe(200);

      // 中身を読んでいない (content_hash だけを持つ) パーツのコミットを作成
      const systemCommit = await createSignedSingleModuleCommitEvent({
        credentials: sysCreds,
        moduleName: "sample",
        moduleDescription: [
          { language: "en", text: "Sample with CAS content" },
        ],
        message: "Commit with CAS hydrated expression",
        parentCommitHash: await latestCommitHashOf("sample", store, env),
        parts: [
          {
            name: "cas-part",
            description: [],
            partType: { "#type_number": null },
            contentHash,
            unresolved: true,
          },
        ],
      });

      const submitRes = await handleWorkerRequest(
        new Request("https://definy.local/definy.v1.EventService/SubmitEvent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedEventBytes: systemCommit.signedEventBytes,
          }),
        }),
        env,
        store,
      );
      expect(submitRes.status).toBe(200);

      // 書き出し実行
      await exportSeeds({
        baseUrl: "https://definy.local",
        fetchFn: mockFetch,
        outDir: tempDir,
        seedsDir: "seeds",
        systemAccountBytes,
      });

      const exportedSampleJson = await readFile(
        join(tempDir, "sample.json"),
        "utf-8",
      );
      const parsedSample = JSON.parse(exportedSampleJson) as {
        readonly parts: ReadonlyArray<{
          readonly name: string;
          readonly expression?: unknown;
          readonly content_hash?: unknown;
        }>;
      };

      const casPart = parsedSample.parts.find((p) => p.name === "cas-part");
      expect(casPart).toBeDefined();
      expect(casPart).toMatchObject({
        description: [{ language: "en", text: "Hydrated from CAS" }],
        expression: { "#number": 42 },
      });
      // content_hash は書き出されない
      expect(casPart?.content_hash).toBeUndefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
