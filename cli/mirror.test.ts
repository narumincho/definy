/**
 * 写しのサーバー (definy-html. docs/html-ui.md) の土台 `definy.cloudflare-service-runtime-script` のテスト.
 * 手元の definy サーバーを公開サーバーの代わりにし, 土台を Node.js で読み込んで, D1 の代わりに SQLite を渡す.
 * Cron (scheduled) で `definy.mirror-pull` が全てのイベントを取り込み, fetch でそのストアを読めること
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createSqliteD1Database } from "../worker/sqlite_d1.ts";
import { startLocalServer } from "./serve.ts";

const dataDir = await mkdtemp(join(tmpdir(), "definy-mirror-test-"));
afterAll(() => rm(dataDir, { recursive: true, force: true }));

type RuntimeWorker = {
  readonly fetch: (request: Request, env: unknown) => Promise<Response>;
  readonly scheduled: (
    controller: unknown,
    env: unknown,
    ctx: { readonly waitUntil: (promise: Promise<unknown>) => void },
  ) => Promise<void>;
};

/** seed の土台の JS を, `./app.wasm` の代わりに module を使うようにして読み込む */
async function loadRuntime(module: WebAssembly.Module): Promise<RuntimeWorker> {
  const seed = JSON.parse(
    await readFile(new URL("../seeds/definy.json", import.meta.url), "utf8"),
  ) as {
    readonly parts: ReadonlyArray<{
      readonly name: string;
      readonly expression: { readonly "#string": string };
    }>;
  };
  const script = seed.parts.find(
    (part) => part.name === "cloudflare-service-runtime-script",
  )!.expression["#string"];
  (globalThis as Record<string, unknown>)["__definyMirrorTestModule"] = module;
  const source = script.replace(
    'import wasmModule from "./app.wasm";',
    "const wasmModule = globalThis.__definyMirrorTestModule;",
  );
  return (
    (await import(
      "data:text/javascript;base64," + Buffer.from(source).toString("base64")
    )) as { readonly default: RuntimeWorker }
  ).default;
}

describe("写しのサーバーの土台 (definy.cloudflare-service-runtime-script)", () => {
  it("Cron で公開サーバーの全てのイベントを取り込み, fetch でストアを読める", async () => {
    const source = await startLocalServer({ dataDir, port: 0 });
    try {
      const call = async (name: string, args: unknown) => {
        const response = await fetch(source.origin + "/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${source.token}`,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        });
        const json = (await response.json()) as {
          readonly result: {
            readonly content: ReadonlyArray<{ readonly text: string }>;
            readonly isError: boolean;
          };
        };
        expect(json.result.isError, json.result.content[0]?.text).toBe(false);
        return json.result.content[0]!.text;
      };
      await call("definy_create_project", { project: "t-proj" });
      await call("definy_commit_parts", {
        project: "t-proj",
        branch: "main",
        changes: [{ part: "t-mod.answer", type: "Number", expression: "42" }],
      });

      const compiled = await call("definy_compile_expression", {
        expression: `{
  fetch: fn(request$0) =>
    @definy.mcp-get-part(
      arguments: #object<@definy.json>([
        {key: "project", value: #string<@definy.json>("t-proj")},
        {key: "part", value: #string<@definy.json>("t-mod.answer")}
      ]),
      request: $0
    ),
  scheduled: fn(time_ms$1) =>
    @definy.mirror-pull(remote: ${JSON.stringify(source.origin)})
}`,
      });
      const worker = await loadRuntime(
        new WebAssembly.Module(Buffer.from(compiled, "base64")),
      );
      const env = { DB: createSqliteD1Database() };
      const runScheduled = async () => {
        const waits: Array<Promise<unknown>> = [];
        await worker.scheduled({}, env, {
          waitUntil: (promise) => waits.push(promise),
        });
        await Promise.all(waits);
      };
      const readPart = async () =>
        await (
          await worker.fetch(new Request("https://definy-html.example/"), env)
        ).text();

      await runScheduled();
      expect(await readPart()).toContain("expression:\n42");

      await call("definy_commit_parts", {
        project: "t-proj",
        branch: "main",
        changes: [{ part: "t-mod.answer", expression: "43" }],
      });
      await runScheduled();
      expect(await readPart()).toContain("expression:\n43");

      // 写しのイベントは公開サーバー (ここでは手元のサーバー) のイベントのうち, 署名の正しいもの全て.
      // seed には署名の検証のテストのための署名の誤ったイベントが 3 つあり (src/invalid_signature_samples.ts), 写しには入らない
      const sourceEvents = (
        (await (
          await fetch(source.origin + "/definy.v1.EventService/GetEvents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          })
        ).json()) as {
          readonly events: ReadonlyArray<{ readonly eventHash: string }>;
        }
      ).events.map((event) => event.eventHash);
      const mirrorEvents = (
        (await env.DB.prepare("SELECT event_hash FROM events").all())
          .results as ReadonlyArray<{ readonly event_hash: string }>
      ).map((row) => row.event_hash);
      expect(mirrorEvents.every((hash) => sourceEvents.includes(hash))).toBe(
        true,
      );
      expect(sourceEvents.length - mirrorEvents.length).toBe(3);
    } finally {
      await source.close();
    }
  }, 300_000);
});
