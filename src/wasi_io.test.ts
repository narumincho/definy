/**
 * `wasi.io` のプログラムを stage1 でコンパイルし, モックの HTTP で動かして確かめる.
 * `sample.deploy-hello-worker` は quote したハンドラを definy 製のコンパイラでコンパイルし,
 * Cloudflare の API に multipart でアップロードする
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  devSystemAccountBytes,
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  selfHostedList,
  selfHostedRecord,
  selfHostedString,
} from "./self_hosted_ast.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  instantiateCompiledValue,
} from "./stage1_compiler.ts";
import {
  runWasiIo,
  type WasiHttpResult,
  type WasiIoStep,
  type WasiOutgoingRequest,
} from "./wasi_io.ts";

const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const accountBytes = await devSystemAccountBytes();
const seedPartExpressions = await loadSeedPartExpressions(accountBytes);

async function compilePart(name: string): Promise<WebAssembly.Module> {
  const expression = await resolvePartPlaceholders(
    { PartReference: { part_definition_event_hash: { $part: name } } },
    accountBytes,
  );
  const { parts, unresolved } = collectReferencedParts(expression, (id) =>
    seedPartExpressions.get(id),
  );
  expect(unresolved).toEqual([]);
  return new WebAssembly.Module(
    compiler.compile(expression, parts) as unknown as BufferSource,
  );
}

function jsonResponse(body: unknown): WasiHttpResult {
  return {
    ok: {
      status: 200,
      headers: [{ name: "content-type", value: "application/json" }],
      body: new TextEncoder().encode(JSON.stringify(body)),
    },
  };
}

/** multipart の本文から name のパートの中身を取り出す */
function multipartPart(body: Uint8Array, name: string): Uint8Array {
  const text = new TextDecoder("latin1").decode(body);
  const header = text.indexOf(`name="${name}"`);
  expect(header).toBeGreaterThan(0);
  const start = text.indexOf("\r\n\r\n", header) + 4;
  const end = text.indexOf("\r\n--definy-deploy-boundary", start);
  return body.slice(start, end);
}

describe("wasi.io", () => {
  it("sample.deploy-hello-worker は quote したハンドラを definy でコンパイルして Cloudflare にアップロードする", async () => {
    const requests: WasiOutgoingRequest[] = [];
    const steps: WasiIoStep[] = [];
    const message = await runWasiIo(
      await compilePart("sample.deploy-hello-worker"),
      {
        getPart: (id) => seedPartExpressions.get(id),
        environment: [
          { name: "CLOUDFLARE_API_TOKEN", value: "test-token" },
          { name: "CLOUDFLARE_ACCOUNT_ID", value: "account-1" },
        ],
        handle: async (request) => {
          requests.push(request);
          return request.url.endsWith("/workers/subdomain")
            ? jsonResponse({
                success: true,
                result: { subdomain: "narumincho" },
              })
            : jsonResponse({ success: true });
        },
        onStep: (step) => {
          steps.push(step);
        },
      },
    );
    expect(message).toBe(
      "デプロイしました: https://definy-hello.narumincho.workers.dev",
    );
    expect(steps.map((step) => step.kind)).toEqual([
      "get_environment",
      "get_parts",
      "outgoing_request",
      "outgoing_request",
      "outgoing_request",
    ]);
    const [upload, enableSubdomain, getSubdomain] = requests;
    expect(upload?.method).toBe("PUT");
    expect(upload?.url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account-1/workers/scripts/definy-hello",
    );
    expect(upload?.headers).toContainEqual({
      name: "Authorization",
      value: "Bearer test-token",
    });
    expect(enableSubdomain?.url).toBe(`${upload?.url}/subdomain`);
    expect(getSubdomain?.method).toBe("GET");

    // アップロードした Wasm はハンドラとして動く
    const body = upload?.body ?? new Uint8Array();
    expect(
      new TextDecoder().decode(multipartPart(body, "worker.js")),
    ).toContain('import wasmModule from "./app.wasm"');
    const handler = instantiateCompiledValue(
      new WebAssembly.Module(
        multipartPart(body, "app.wasm") as unknown as BufferSource,
      ),
    );
    const responsePointer = handler.callClosure(handler.root, [
      handler.writeArgument(
        selfHostedRecord([
          ["method", selfHostedString("GET")],
          ["url", selfHostedString("https://definy-hello.example/")],
          ["headers", selfHostedList([])],
        ]),
      ),
    ]);
    expect(handler.read(handler.recordField(responsePointer, "status"))).toBe(
      200,
    );
    const stream = handler.recordField(responsePointer, "body");
    const step = handler.callClosure(handler.recordField(stream, "next"), [
      handler.recordField(stream, "initialState"),
    ]);
    const chunk = handler.read(
      handler.recordField(handler.variant(step).payload ?? 0, "chunk"),
    ) as ReadonlyArray<number>;
    expect(new TextDecoder().decode(new Uint8Array(chunk))).toBe(
      "Hello from definy! https://definy-hello.example/",
    );
  }, 120_000);

  it("環境変数が無ければ HTTP リクエストを送らずに止まる", async () => {
    const requests: WasiOutgoingRequest[] = [];
    const message = await runWasiIo(
      await compilePart("sample.deploy-hello-worker"),
      {
        getPart: (id) => seedPartExpressions.get(id),
        environment: [],
        handle: async (request) => {
          requests.push(request);
          return { error: "unexpected" };
        },
      },
    );
    expect(message).toContain("CLOUDFLARE_API_TOKEN");
    expect(requests).toEqual([]);
  }, 120_000);

  it("アップロードが失敗したらその理由を返す", async () => {
    const message = await runWasiIo(
      await compilePart("sample.deploy-hello-worker"),
      {
        getPart: (id) => seedPartExpressions.get(id),
        environment: [
          { name: "CLOUDFLARE_API_TOKEN", value: "t" },
          { name: "CLOUDFLARE_ACCOUNT_ID", value: "a" },
        ],
        handle: async () => ({ error: "Failed to fetch" }),
      },
    );
    expect(message).toBe("アップロードできませんでした: Failed to fetch");
  }, 120_000);
});
