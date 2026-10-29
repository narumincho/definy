import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "../src/seed_parts.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
} from "../src/stage1_compiler.ts";
import { runWasiIo, type WasiOutgoingRequest } from "../src/wasi_io.ts";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import type { Env } from "./types.ts";

const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const seedPartExpressions = await loadSeedPartExpressions();

async function compileExpression(
  expression: unknown,
): Promise<WebAssembly.Module> {
  const resolved = await resolvePartPlaceholders(expression);
  const { parts, unresolved } = collectReferencedParts(resolved, (id) =>
    seedPartExpressions.get(id),
  );
  expect(unresolved).toEqual([]);
  return new WebAssembly.Module(
    compiler.compile(resolved, parts) as unknown as BufferSource,
  );
}

const partReference = (name: string): unknown => ({
  "#part_reference": { part_definition_event_hash: { $part: name } },
});

/** seed を入れた Worker に wasi.io の HTTP リクエストを送るホスト */
async function workerHost(): Promise<{
  readonly requests: WasiOutgoingRequest[];
  readonly handle: (
    request: WasiOutgoingRequest,
  ) => ReturnType<Parameters<typeof runWasiIo>[1]["handle"]>;
}> {
  const store = new WorkerStore();
  const db = createSqliteD1Database();
  await store.seedD1(db, await loadTestSeedBundle());
  const env: Env = { DB: db };
  const requests: WasiOutgoingRequest[] = [];
  return {
    requests,
    handle: async (request) => {
      requests.push(request);
      const res = await handleWorkerRequest(
        new Request(new URL(request.url, "https://definy.local"), {
          method: request.method,
          headers: request.headers.map((h): [string, string] => [
            h.name,
            h.value,
          ]),
          body: request.body as unknown as BodyInit,
        }),
        env,
        store,
      );
      const body = new Uint8Array(await res.arrayBuffer());
      return { ok: { status: res.status, headers: [], body } };
    },
  };
}

describe("署名が不正なイベントを送るテストのパーツ", () => {
  it("definy.check-invalid-signatures-rejected は 3 件とも 400 で拒否されたと報告する", async () => {
    const host = await workerHost();
    const message = await runWasiIo(
      await compileExpression(
        partReference("definy.check-invalid-signatures-rejected"),
      ),
      {
        getPart: (id) => seedPartExpressions.get(id),
        getSecret: () => undefined,
        handle: host.handle,
      },
    );
    expect(message.split("\n")[0]).toBe(
      "OK: すべて署名が不正として拒否されました",
    );
    expect(message.split("\n").slice(1)).toEqual([
      expect.stringContaining("署名が不正として拒否された: "),
      expect.stringContaining("署名が不正として拒否された: "),
      expect.stringContaining("署名が不正として拒否された: "),
    ]);
    expect(host.requests.map((r) => r.url)).toEqual([
      "/definy.v1.EventService/SubmitEvent",
      "/definy.v1.EventService/SubmitEvent",
      "/definy.v1.EventService/SubmitEvent",
    ]);
  }, 120_000);

  // 正しく署名したイベントは (seed にあるアカウントなので) 別の理由で拒否される. 署名の理由でなければ NG
  it("書き換える前の正しく署名したイベントは署名が不正として拒否されないので NG と報告する", async () => {
    const host = await workerHost();
    const message = await runWasiIo(
      await compileExpression({
        "#call": {
          function: partReference("definy.submit-events-expect-rejected"),
          arguments: [
            { name: "base_url", value: { "#string": "" } },
            {
              name: "events",
              value: {
                "#list": [
                  partReference("definy.invalid-signature-test-signed-account"),
                ],
              },
            },
          ],
        },
      }),
      {
        getPart: (id) => seedPartExpressions.get(id),
        getSecret: () => undefined,
        handle: host.handle,
      },
    );
    expect(message.split("\n")[0]).toBe(
      "NG: 署名が不正として拒否されなかったイベントがあります",
    );
  }, 120_000);

  it("std.bytes-to-base64 は標準 Base64 (パディング付き) になる", async () => {
    for (const bytes of [[], [0], [255, 1], [1, 2, 3], [250, 251, 252, 253]]) {
      const message = await runWasiIo(
        await compileExpression({
          "#variant": {
            tag: "done",
            payload: {
              "#some": {
                "#call": {
                  function: partReference("std.bytes-to-base64"),
                  arguments: [
                    {
                      name: "bytes",
                      value: { "#list": bytes.map((b) => ({ "#number": b })) },
                    },
                  ],
                },
              },
            },
            type_part: { "#some": { $part: "wasi.io" } },
          },
        }),
        {
          getPart: () => undefined,
          getSecret: () => undefined,
          handle: async () => ({ error: "unused" }),
        },
      );
      expect(message).toBe(new Uint8Array(bytes).toBase64());
    }
  }, 120_000);
});
