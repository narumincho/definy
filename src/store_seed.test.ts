import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToUrlSafeBase64NoPad } from "./base64.ts";
import { decodeVerifiedSignedEvent } from "./signed_event.ts";
import { compileSeedFunction } from "./event_check.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import {
  devSystemAccountBytes,
  loadSeedPartExpressions,
} from "./seed_parts.ts";
import { loadProjectSeeds } from "./seed_projects.ts";
import { createStage1Compiler } from "./stage1_compiler.ts";
import { exportStoreSeed } from "./store_export.ts";
import {
  readStoreSeed,
  storeSeedPartExpressions,
  writeStoreSeed,
} from "./store_seed.ts";
import { handleWorkerRequest, WorkerStore } from "../worker/index.ts";
import { createSqliteD1Database } from "../worker/test_helpers.ts";
import { loadTestSeedBundle } from "../worker/test_runtime.ts";
import type { Env } from "../worker/types.ts";

describe("seeds/store", () => {
  it("seed で初期化したサーバーから書き出して読み直すと, seeds/*.json と同じパーツと同じイベントになり, 同じ service の wasm ができる", async () => {
    const seedBundle = await loadTestSeedBundle();
    const store = new WorkerStore();
    const env: Env = {
      DB: createSqliteD1Database(),
      ASSETS: {
        fetch(input: Request | URL | string): Promise<Response> {
          const url = input instanceof Request ? input.url : String(input);
          return Promise.resolve(
            url.endsWith("/__definy_seed_bundle.json")
              ? new Response(JSON.stringify(seedBundle), { status: 200 })
              : new Response("SPA", { status: 200 }),
          );
        },
      },
    };
    const fetchFn: typeof fetch = (input, init) =>
      handleWorkerRequest(
        input instanceof Request ? input : new Request(input, init),
        env,
        store,
      );
    const accountId = bytesToUrlSafeBase64NoPad(await devSystemAccountBytes());
    const projects = loadProjectSeeds().map((p) => p.project_name);
    const dir = await mkdtemp(join(tmpdir(), "definy-store-seed-"));
    try {
      await writeStoreSeed(
        dir,
        await exportStoreSeed({
          baseUrl: "https://definy.local",
          accountId,
          projects,
          fetchFn,
        }),
      );
      const seed = await readStoreSeed(dir);
      expect(Object.keys(seed.heads.projects)).toEqual(projects);

      // イベントは seed のうち署名の正しいもの (プロジェクトのコミットとアカウントの作成)
      const expectedEvents: Array<string> = [];
      for (const e of seedBundle.events) {
        const valid = await decodeVerifiedSignedEvent(
          base64ToBytes(e.signedEventBytes),
        ).then(
          () => true,
          () => false,
        );
        if (valid && e.accountId === accountId) {
          expectedEvents.push(e.eventHash);
        }
      }
      expectedEvents.sort();
      expect(seed.bundle.events.map((e) => e.eventHash).sort()).toEqual(
        expectedEvents,
      );

      const expected = await loadSeedPartExpressions();
      const actual = storeSeedPartExpressions(seed);
      expect([...actual.keys()].sort()).toEqual([...expected.keys()].sort());
      const different = [...expected].filter(
        ([id, expression]) =>
          !isDeepStrictEqual(actual.get(id), expression ?? undefined),
      );
      expect(different.map(([id]) => id)).toEqual([]);

      const compile = async (parts: ReadonlyMap<string, unknown>) =>
        compileSeedFunction({
          compiler: createStage1Compiler(
            new WebAssembly.Module(await readFile(resolve("wasm/stage1.wasm"))),
          ),
          partId: deriveModulePartId(
            deriveModuleIdBytes("definy"),
            "handle-request",
          ),
          resolvePart: (id) => parts.get(id),
        });
      expect(await compile(actual)).toEqual(
        new Uint8Array(await readFile(resolve("wasm/service.wasm"))),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 300_000);
});
