/**
 * 構造化並行性 (definy.io の all / race / sleep. docs/structured-concurrency.md) のテスト
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateAccountCredentials } from "./auth.ts";
import { IoSignals, IoUnsupported, runIo } from "./io_runner.ts";
import {
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  collectReferencedParts,
  createStage1Compiler,
  instantiateCompiledValue,
  type ValueRef,
} from "./stage1_compiler.ts";
import {
  runWasiIo,
  type WasiHttpResult,
  type WasiOutgoingRequest,
} from "./wasi_io.ts";
import { handleWorkerRequest, WorkerStore } from "../worker/index.ts";
import { createSqliteD1Database } from "../worker/test_helpers.ts";
import type { Env } from "../worker/types.ts";

const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);
const seedPartExpressions = await loadSeedPartExpressions();

async function compilePart(name: string): Promise<WebAssembly.Module> {
  const expression = await resolvePartPlaceholders({
    "#part_reference": { part_definition_event_hash: { $part: name } },
  });
  const { parts, unresolved } = collectReferencedParts(expression, (id) =>
    seedPartExpressions.get(id),
  );
  expect(unresolved).toEqual([]);
  return new WebAssembly.Module(
    compiler.compile(expression, parts) as unknown as BufferSource,
  );
}

const textResponse = (text: string): WasiHttpResult => ({
  ok: { status: 200, headers: [], body: new TextEncoder().encode(text) },
});

/** `signal` が中断されるまで待つ (中断されたら `error`) */
const waitForAbort = (signal: AbortSignal | undefined) =>
  new Promise<WasiHttpResult>((resolve) => {
    if (signal?.aborted === true) {
      resolve({ error: "aborted" });
      return;
    }
    signal?.addEventListener("abort", () => resolve({ error: "aborted" }), {
      once: true,
    });
  });

describe("definy.io の all / race / sleep", () => {
  it("all は子を並行に動かして順に結果を渡し, race は負けた子をキャンセルする (sample.io-all-race)", async () => {
    const started: string[] = [];
    const aborted: string[] = [];
    let release: () => void = () => {};
    const bothStarted = new Promise<void>((resolve) => {
      release = resolve;
    });
    const message = await runWasiIo(await compilePart("sample.io-all-race"), {
      handle: async (request: WasiOutgoingRequest, signal) => {
        started.push(request.url);
        if (request.url === "https://slow.example/") {
          const result = await waitForAbort(signal);
          aborted.push(request.url);
          return result;
        }
        if (started.length === 2) {
          release();
        }
        // a と b が両方始まってから答える (並行に動いていなければ止まる)
        await bothStarted;
        // b を先に返しても, 結果は tasks の順に並ぶ
        if (request.url === "https://a.example/") {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        return textResponse(request.url === "https://a.example/" ? "A" : "B");
      },
      getPart: () => undefined,
      getSecret: () => undefined,
    });
    expect(message).toBe("A, B, timeout");
    expect(started).toEqual([
      "https://a.example/",
      "https://b.example/",
      "https://slow.example/",
    ]);
    // race で負けた遅いリクエストは, race が then を呼ぶ前に止められている
    expect(aborted).toEqual(["https://slow.example/"]);
  });

  it("子が失敗したら他の子を止め, 止まるのを待ってから失敗を返す", async () => {
    const instance = instantiateCompiledValue(
      await compilePart("sample.io-all-race"),
    );
    const events: string[] = [];
    const result = runIo(instance, instance.root, {
      maxSteps: 100,
      leaf: async (_tag, payload, signal) => {
        const url = String(
          (
            instance.read(instance.recordField(payload, "request")) as {
              readonly url: string;
            }
          ).url,
        );
        if (url === "https://a.example/") {
          throw new Error("host failure");
        }
        // 書き込みのように, 中断されても最後まで終わらせる I/O
        await new Promise((resolve) => setTimeout(resolve, 10));
        events.push(`${url} finished (aborted: ${signal.aborted})`);
        return instance.writeArgument({ "#error": "unused" });
      },
    });
    await expect(result).rejects.toThrow("host failure");
    // 失敗を返したときには, もう一方の子も終わっている (宙に浮いていない)
    expect(events).toEqual(["https://b.example/ finished (aborted: true)"]);
  });

  it("ホストができない I/O を頼まれたら IoUnsupported", async () => {
    const instance = instantiateCompiledValue(
      await compilePart("sample.io-all-race"),
    );
    await expect(
      runIo(instance, instance.root, {
        maxSteps: 100,
        leaf: (tag): Promise<ValueRef> =>
          Promise.reject(new IoUnsupported(tag)),
      }),
    ).rejects.toThrow("this host cannot do the I/O 'outgoing_request'");
  });

  it("全体の signal を中断すると, 動いている全てのタスクを止める", async () => {
    const instance = instantiateCompiledValue(
      await compilePart("sample.io-all-race"),
    );
    const controller = new AbortController();
    let started = 0;
    const result = runIo(instance, instance.root, {
      maxSteps: 100,
      signal: controller.signal,
      leaf: async (_tag, _payload, signal) => {
        started += 1;
        if (started === 2) {
          controller.abort();
        }
        await waitForAbort(signal);
        return instance.writeArgument({ "#error": "aborted" });
      },
    });
    await expect(result).rejects.toThrow("the task was cancelled");
    expect(started).toBe(2);
  });
});

describe("wait_signal / send_signal (外からのキャンセル)", () => {
  it("race で wait_signal に負けた長いタスクはキャンセルされる (sample.io-cancel-by-signal)", async () => {
    const started = Date.now();
    const message = await runWasiIo(
      await compilePart("sample.io-cancel-by-signal"),
      {
        handle: () => Promise.resolve({ error: "unused" }),
        getPart: () => undefined,
        getSecret: () => undefined,
      },
    );
    expect(message).toBe("cancelled: by request, sent");
    // 60 秒の sleep を待たずに終わる
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it("合図はキーを待っている全員に届き, キャンセルされた待ちは残らない", async () => {
    const signals = new IoSignals();
    const cancelled = new AbortController();
    const first = signals.wait("job-1", new AbortController().signal);
    const second = signals.wait("job-1", new AbortController().signal);
    const gone = signals.wait("job-1", cancelled.signal);
    cancelled.abort();
    expect(await gone).toBeUndefined();
    expect(signals.send("job-2", "x")).toBe(0);
    expect(signals.send("job-1", "stop")).toBe(2);
    expect(await first).toBe("stop");
    expect(await second).toBe("stop");
    expect(signals.send("job-1", "again")).toBe(0);
  });
});

describe("型を持つレコード (all / race の Child)", () => {
  const commit = async (
    changes: ReadonlyArray<{
      readonly part: string;
      readonly type: string;
      readonly expression: string;
    }>,
  ) => {
    const credentials = await generateAccountCredentials("io-bot");
    const env: Env = {
      DB: createSqliteD1Database(),
      DEFINY_MCP_ACCOUNT_SECRET_KEY: credentials.secretKeyBase64,
      DEFINY_MCP_ACCOUNT_NAME: "io-bot",
    };
    const store = new WorkerStore();
    const call = async (name: string, args: unknown) => {
      const response = await handleWorkerRequest(
        new Request("https://definy.workers.dev/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        }),
        env,
        store,
        fetch,
        () => Promise.resolve(new Response("asset")),
      );
      const json = (await response.json()) as {
        readonly result: {
          readonly content: ReadonlyArray<{ readonly text: string }>;
          readonly isError: boolean;
        };
      };
      return {
        text: json.result.content[0]!.text,
        isError: json.result.isError,
      };
    };
    const branch = await call("definy_create_branch", {
      project: "sample",
      branch: "io-work",
    });
    expect(branch.isError, branch.text).toBe(false);
    return await call("definy_commit_parts", {
      project: "sample",
      branch: "io-work",
      changes,
    });
  };

  it("Child に書いた型が tasks と then の型になる", async () => {
    const ok = await commit([
      {
        part: "sample.io-child-ok",
        type: "@definy.io(A: List<Number>)",
        expression:
          "#all({Child: Number, tasks: [#done(1), #done(2)], then: fn(results$0) => #done($0)})",
      },
    ]);
    expect(ok.isError, ok.text).toBe(false);

    const wrongTask = await commit([
      {
        part: "sample.io-child-wrong",
        type: "@definy.io(A: List<Number>)",
        expression:
          '#all({Child: Number, tasks: [#done("x")], then: fn(results$0) => #done($0)})',
      },
    ]);
    expect(wrongTask.text).toContain(
      "type_mismatch (expected: number, actual: string)",
    );

    const wrongThen = await commit([
      {
        part: "sample.io-child-wrong-then",
        type: "@definy.io(A: String)",
        expression:
          "#race({Child: Number, tasks: [#done(1)], then: fn(result$0) => #done($0)})",
      },
    ]);
    expect(wrongThen.text).toContain(
      "type_mismatch (expected: string, actual: number)",
    );
  }, 60_000);

  it("型の別名 (definy.service-io = definy.io(A: definy.service-outcome)) は呼び出しと同じ型", async () => {
    const result = await commit([
      {
        part: "sample.io-alias",
        type: "Fn(io: @definy.io(A: @definy.service-outcome)) -> @definy.service-io",
        expression: "fn(io$0) => $0",
      },
    ]);
    expect(result.isError, result.text).toBe(false);
  }, 60_000);
});
