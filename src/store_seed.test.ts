import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import { base64ToBytes } from "./base64.ts";
import { decodeVerifiedSignedEvent } from "./signed_event.ts";
import { compileSeedFunction } from "./event_check.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import { loadSeedPartExpressions } from "./seed_parts.ts";
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
  it("seeds/store の seed で始めたサーバーから書き出すと同じ heads とイベントになり, パーツも同じで, 同じ service の wasm ができる", async () => {
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
    const repoSeed = await readStoreSeed();
    const projects = Object.keys(repoSeed.heads.projects);
    const accountId = repoSeed.bundle.events.find(
      (e) => e.eventHash === repoSeed.heads.projects[projects[0] ?? ""],
    )?.accountId;
    if (accountId === undefined) {
      throw new Error("no head commit");
    }
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
      expect(seed.heads).toEqual(repoSeed.heads);

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
      expect(
        different.map(([id]) => id),
        "書き出したパーツが seeds/store と違う",
      ).toEqual([]);

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
