import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  devSystemAccountBytes,
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
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
  type WasiSecretUse,
  type WasiSecretValue,
} from "./wasi_io.ts";

/** seeds/definy.json の definy.cloudflare-api-token の ID */
const CLOUDFLARE_API_TOKEN_ID = "cloudflare-api-token-6c1f0e3a9b2d4c58";

const cloudflareToken = (
  value: string,
  allowedUrlPrefixes: ReadonlyArray<string> = ["https://api.cloudflare.com/"],
): ((id: string) => WasiSecretValue | undefined) => {
  return (id) =>
    id === CLOUDFLARE_API_TOKEN_ID ? { value, allowedUrlPrefixes } : undefined;
};

/** Cloudflare の API のモック. アカウントの一覧とサブドメインを返す */
function cloudflareApi(
  requests: WasiOutgoingRequest[],
): (request: WasiOutgoingRequest) => Promise<WasiHttpResult> {
  return async (request) => {
    requests.push(request);
    if (request.url.endsWith("/client/v4/accounts")) {
      return jsonResponse({
        success: true,
        result: [{ id: "account-1", name: "narumincho" }],
      });
    }
    return request.url.endsWith("/workers/subdomain")
      ? jsonResponse({ success: true, result: { subdomain: "narumincho" } })
      : jsonResponse({ success: true });
  };
}

const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const accountBytes = await devSystemAccountBytes();
const seedPartExpressions = await loadSeedPartExpressions(accountBytes);

async function compilePart(name: string): Promise<WebAssembly.Module> {
  const expression = await resolvePartPlaceholders(
    { "#part_reference": { part_definition_event_hash: { $part: name } } },
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

/** Cloudflare の API と同じく整形した JSON (`"key": "value"`) で返す */
function jsonResponse(body: unknown): WasiHttpResult {
  return {
    ok: {
      status: 200,
      headers: [{ name: "content-type", value: "application/json" }],
      body: new TextEncoder().encode(JSON.stringify(body, null, 2)),
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
    const uses: WasiSecretUse[] = [];
    const message = await runWasiIo(
      await compilePart("sample.deploy-hello-worker"),
      {
        getPart: (id) => seedPartExpressions.get(id),
        getSecret: cloudflareToken("test-token"),
        handle: cloudflareApi(requests),
        onSecretUse: (use) => {
          uses.push(use);
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
      "get_parts",
      "outgoing_request",
      "outgoing_request",
      "outgoing_request",
      "outgoing_request",
    ]);
    const [accounts, upload, enableSubdomain, getSubdomain] = requests;
    // アカウント ID はトークンから読む
    expect(accounts?.url).toBe("https://api.cloudflare.com/client/v4/accounts");
    // どのリクエストにもシークレットの値をホストが入れる
    for (const request of requests) {
      expect(request.headers).toContainEqual({
        name: "Authorization",
        value: "Bearer test-token",
      });
    }
    expect(uses).toHaveLength(4);
    expect(uses.every((use) => use.sent)).toBe(true);
    expect(uses[0]?.secret).toEqual({
      id: CLOUDFLARE_API_TOKEN_ID,
      label: "Cloudflare API トークン",
    });
    expect(upload?.method).toBe("PUT");
    expect(upload?.url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account-1/workers/scripts/definy-hello",
    );
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
      handler.writeArgument({
        method: "GET",
        url: "https://definy-hello.example/",
        headers: [],
      }),
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

  it("シークレットの値が無ければ HTTP リクエストを送らずに止まる", async () => {
    const requests: WasiOutgoingRequest[] = [];
    const uses: WasiSecretUse[] = [];
    const message = await runWasiIo(
      await compilePart("sample.deploy-hello-worker"),
      {
        getPart: (id) => seedPartExpressions.get(id),
        getSecret: () => undefined,
        handle: cloudflareApi(requests),
        onSecretUse: (use) => {
          uses.push(use);
        },
      },
    );
    expect(message).toBe(
      "アカウントを読めませんでした: シークレット「Cloudflare API トークン」の値が入っていません. そのシークレットのパーツのページで値を入れてください",
    );
    expect(requests).toEqual([]);
    expect(uses.map((use) => use.sent)).toEqual([false]);
  }, 120_000);

  it("シークレットは値を入れたときに許可した宛先にしか送らない", async () => {
    const requests: WasiOutgoingRequest[] = [];
    const message = await runWasiIo(
      await compilePart("sample.deploy-hello-worker"),
      {
        getPart: (id) => seedPartExpressions.get(id),
        getSecret: cloudflareToken("t", ["https://example.com/"]),
        handle: cloudflareApi(requests),
      },
    );
    expect(message).toContain(
      "は https://api.cloudflare.com/client/v4/accounts に送れません",
    );
    expect(requests).toEqual([]);
  }, 120_000);

  it("アップロードが失敗したらその理由を返す", async () => {
    const message = await runWasiIo(
      await compilePart("sample.deploy-hello-worker"),
      {
        getPart: (id) => seedPartExpressions.get(id),
        getSecret: cloudflareToken("t"),
        handle: async (request) =>
          request.method === "PUT"
            ? { error: "Failed to fetch" }
            : cloudflareApi([])(request),
      },
    );
    expect(message).toBe("アップロードできませんでした: Failed to fetch");
  }, 120_000);
});
