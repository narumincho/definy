import { describe, expect, it } from "vitest";
import {
  createSignedModuleCommitEvent,
  generateAccountCredentials,
  importAccountCredentials,
  type AccountCredentials,
} from "../src/auth.ts";
import {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  encodeCborItem,
  sha256Bytes,
  type DecodedPart,
} from "../src/cbor.ts";
import { STAGE1_OUTPUT_CACHE_PREFIX } from "../src/deploy_target.ts";
import { INVALID_SIGNATURE_SAMPLE_MODULE_NAME } from "../src/invalid_signature_samples.ts";
import { evaluateCompiledWasm } from "../src/stage1_compiler.ts";
import { DEV_SYSTEM_KEY_SEED } from "../src/system_account.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./cbor.ts";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { compilePartToWasm, PartCompileError } from "./part_compiler.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { loadTestSeedBundle, type TestSeedBundle } from "./test_runtime.ts";
import type { Env } from "./types.ts";

async function createSeededStore(bundle?: TestSeedBundle): Promise<{
  readonly store: WorkerStore;
  readonly env: Env;
}> {
  const store = new WorkerStore();
  const db = createSqliteD1Database();
  await store.seedD1(db, bundle ?? (await loadTestSeedBundle()));
  return { store, env: { DB: db } };
}

async function submitCommit(
  store: WorkerStore,
  env: Env,
  credentials: AccountCredentials,
  moduleName: string,
  parts: ReadonlyArray<DecodedPart>,
): Promise<void> {
  const commit = await createSignedModuleCommitEvent({
    credentials,
    moduleName,
    moduleDescription: [],
    message: "test",
    parts,
  });
  const res = await handleWorkerRequest(
    new Request("https://definy.local/definy.v1.EventService/SubmitEvent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedEventBytes: commit.signedEventBytes }),
    }),
    env,
    store,
  );
  expect(res.status).toBe(200);
}

function stringPart(name: string, value: string): DecodedPart {
  return {
    name,
    description: [],
    partType: "string",
    expression: { String: { value } },
  };
}

async function partIdOf(
  accountId: string,
  moduleName: string,
  partName: string,
): Promise<string> {
  return await deriveModulePartId(
    await deriveModuleIdBytes(base64ToBytes(accountId), moduleName),
    partName,
  );
}

async function compiledValue(
  partId: string,
  store: WorkerStore,
  env: Env,
): Promise<unknown> {
  const compiled = await compilePartToWasm(partId, store, env);
  return await evaluateCompiledWasm(compiled.wasmBytes);
}

describe("compilePartToWasm", () => {
  it("システムアカウントの module.part を stage1 でコンパイルする", async () => {
    const { store, env } = await createSeededStore();
    const compiled = await compilePartToWasm("sample.greet", store, env);
    expect(compiled.cloudflareWorkerName).toBe(null);
    expect(await evaluateCompiledWasm(compiled.wasmBytes)).toBe(
      "Hello, definy!",
    );
    expect(await compiledValue("sample.prime-numbers", store, env)).toEqual([
      2, 3, 5, 7, 11,
    ]);
    // 参照先のパーツ (core.eval-ast など) もたどってコンパイルする
    expect(await compiledValue("sample.sample-ast-calc", store, env)).toBe(95);
  });

  it("パーツ ID でも指定できる", async () => {
    const { store, env } = await createSeededStore();
    const system = await importAccountCredentials(
      bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED),
      "definy",
    );
    const partId = await partIdOf(system.accountId, "sample", "greet");
    expect(await compiledValue(partId, store, env)).toBe("Hello, definy!");
  });

  it("deploy の handler を事前コンパイル済みのキャッシュから取り, worker 名を返す", async () => {
    const bundle = await loadTestSeedBundle();
    const { store, env } = await createSeededStore(bundle);
    const compiled = await compilePartToWasm(
      "sample.self-hosted-definy-server",
      store,
      env,
    );
    expect(compiled.cloudflareWorkerName).toBe("self-definy");
    expect(compiled.cloudflareToken).toBe("");
    const cached = bundle.contents.find((c) =>
      c.contentHash.startsWith(STAGE1_OUTPUT_CACHE_PREFIX),
    );
    expect(cached).toBeDefined();
    expect(bytesToUrlSafeBase64NoPad(compiled.wasmBytes)).toBe(
      bytesToUrlSafeBase64NoPad(base64ToBytes(cached?.contentBytes ?? "")),
    );
  });

  it("キャッシュが無くても大きなパーツを stage1 でコンパイルでき, キャッシュと同じバイト列になる", async () => {
    const bundle = await loadTestSeedBundle();
    const cached = await createSeededStore(bundle);
    const uncached = await createSeededStore({
      ...bundle,
      contents: bundle.contents.filter(
        (c) => !c.contentHash.startsWith(STAGE1_OUTPUT_CACHE_PREFIX),
      ),
    });
    const fromCache = await compilePartToWasm(
      "sample.self-hosted-definy-server",
      cached.store,
      cached.env,
    );
    const compiled = await compilePartToWasm(
      "sample.self-hosted-definy-server",
      uncached.store,
      uncached.env,
    );
    expect(compiled.cloudflareWorkerName).toBe("self-definy");
    expect(bytesToUrlSafeBase64NoPad(compiled.wasmBytes)).toBe(
      bytesToUrlSafeBase64NoPad(fromCache.wasmBytes),
    );
  });

  it("スタックが足りないほど深い式は resource_exhausted", async () => {
    // Add の右に 5000 段入れ子にした式. テスト側で溢れないように CBOR を再帰せずに組み立てる
    const depth = 5000;
    const prefix = [
      0xa1,
      ...encodeCborItem("Add"),
      0xa2,
      ...encodeCborItem("left"),
      ...encodeCborItem({ Number: { value: 1 } }),
      ...encodeCborItem("right"),
    ];
    const leaf = encodeCborItem({ Number: { value: 1 } });
    const bytes = new Uint8Array(prefix.length * depth + leaf.length);
    for (let i = 0; i < depth; i++) {
      bytes.set(prefix, i * prefix.length);
    }
    bytes.set(leaf, prefix.length * depth);
    const contentHash = bytesToUrlSafeBase64NoPad(await sha256Bytes(bytes));
    const bundle = await loadTestSeedBundle();
    const { store, env } = await createSeededStore({
      ...bundle,
      contents: [
        ...bundle.contents,
        { contentHash, contentBytes: bytesToBase64(bytes) },
      ],
    });
    const error = await compilePartToWasm(contentHash, store, env).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(PartCompileError);
    expect((error as PartCompileError).code).toBe("resource_exhausted");
  });

  it("他のアカウントが同じ名前のモジュールを作っても module.part はシステムアカウントのパーツになる", async () => {
    const { store, env } = await createSeededStore();
    const other = await generateAccountCredentials("other");
    await submitCommit(store, env, other, "sample", [
      stringPart("greet", "hijacked"),
    ]);
    expect(await compiledValue("sample.greet", store, env)).toBe(
      "Hello, definy!",
    );
    // そのアカウントのパーツはパーツ ID で指定できる
    expect(
      await compiledValue(
        await partIdOf(other.accountId, "sample", "greet"),
        store,
        env,
      ),
    ).toBe("hijacked");
  });

  it("同じパーツは最新のコミットの式を使う", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    await submitCommit(store, env, user, "app", [stringPart("message", "v1")]);
    const partId = await partIdOf(user.accountId, "app", "message");
    expect(await compiledValue(partId, store, env)).toBe("v1");

    const commit = await createSignedModuleCommitEvent(
      {
        credentials: user,
        moduleName: "app",
        moduleDescription: [],
        message: "v2",
        parts: [stringPart("message", "v2")],
      },
      Math.floor(Date.now() / 1000) + 1,
    );
    await handleWorkerRequest(
      new Request("https://definy.local/definy.v1.EventService/SubmitEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedEventBytes: commit.signedEventBytes }),
      }),
      env,
      store,
    );
    expect(await compiledValue(partId, store, env)).toBe("v2");
  });

  it("見つからないパーツは not_found", async () => {
    const { store, env } = await createSeededStore();
    const error = await compilePartToWasm("sample.no-such-part", store, env)
      .then(() => undefined)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PartCompileError);
    expect((error as PartCompileError).code).toBe("not_found");
  });

  it("seed の署名が不正なサンプル (システムアカウントへのなりすまし) のパーツは使わない", async () => {
    const { store, env } = await createSeededStore();
    const error = await compilePartToWasm(
      `${INVALID_SIGNATURE_SAMPLE_MODULE_NAME}.answer`,
      store,
      env,
    )
      .then(() => undefined)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PartCompileError);
    expect((error as PartCompileError).code).toBe("not_found");
  });
});
