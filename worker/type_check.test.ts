import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  createSignedAccountEvent,
  generateAccountCredentials,
  importAccountCredentials,
  type CommitModuleParams,
  type AccountCredentials,
} from "../src/auth.ts";
import {
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  encodeCborItem,
  sha256EventHashIdSync,
  type DecodedPart,
} from "../src/cbor.ts";
import {
  resolvePartPlaceholders,
  resolveSeedPartType,
} from "../src/seed_parts.ts";
import { DEV_SYSTEM_KEY_SEED } from "../src/system_account.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./cbor.ts";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { latestCommitHashOf } from "./type_check.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import type { Env } from "./types.ts";
import { createSignedSingleModuleCommitEvent } from "../src/test_commit.ts";
import type { Visibility } from "../src/event_content.ts";

async function createSeededStore(): Promise<{
  readonly store: WorkerStore;
  readonly env: Env;
}> {
  const store = new WorkerStore();
  const db = createSqliteD1Database();
  await store.seedD1(db, await loadTestSeedBundle());
  return { store, env: { DB: db } };
}

async function submitEvent(
  store: WorkerStore,
  env: Env,
  signedEventBytes: string,
): Promise<{ readonly status: number; readonly message: string }> {
  const res = await handleWorkerRequest(
    new Request("https://definy.local/definy.v1.EventService/SubmitEvent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedEventBytes }),
    }),
    env,
    store,
  );
  const json = (await res.json()) as { readonly message?: string };
  return { status: res.status, message: json.message ?? "" };
}

/**
 * アカウントを作っていなければ作ってから, プロジェクト (省くとモジュール名と同じ) にモジュール 1 つだけを,
 * プロジェクトの最新のコミットを親にしてコミットする
 * (イベントを受け付ける規則 core.check-event. docs/event.md)
 */
async function submitCommit(
  store: WorkerStore,
  env: Env,
  credentials: AccountCredentials,
  moduleName: string,
  parts: ReadonlyArray<DecodedPart>,
  projectName: string = moduleName,
  moduleVisibility: Visibility = "public",
  otherModules: ReadonlyArray<CommitModuleParams> = [],
): Promise<{ readonly status: number; readonly message: string }> {
  const accounts = await store.getEvents(
    { eventType: "create_account", limit: 500 },
    env,
  );
  if (!accounts.some((item) => item.accountId === credentials.accountId)) {
    expect(
      await submitEvent(
        store,
        env,
        (await createSignedAccountEvent(credentials)).signedEventBytes,
      ),
    ).toEqual({ status: 200, message: "" });
  }
  const commit = await createSignedSingleModuleCommitEvent({
    credentials,
    projectName,
    moduleName,
    moduleDescription: [],
    moduleVisibility,
    message: "test",
    parentCommitHash: await latestCommitHashOf(projectName, store, env),
    parts,
    otherModules,
  });
  await store.uploadContent([...commit.contents.values()], env);
  return submitEvent(store, env, commit.signedEventBytes);
}

function part(
  name: string,
  partType: unknown,
  expression: unknown,
): DecodedPart {
  return { name, description: [], partType, expression };
}

async function partReference(
  accountId: string,
  moduleName: string,
  partName: string,
): Promise<unknown> {
  return {
    "#part_reference": {
      part_definition_event_hash: await deriveModulePartId(
        await deriveModuleIdBytes(moduleName),
        partName,
      ),
    },
  };
}

/**
 * 中身を定義の式 `definition` で書いたパーツ (docs/part-definition.md). 中身は CAS に送っておく
 */
async function definedPart(
  store: WorkerStore,
  env: Env,
  name: string,
  definition: unknown,
): Promise<DecodedPart> {
  const bytes = encodeCborItem(definition);
  const contentHash = sha256EventHashIdSync(bytes);
  await store.uploadContent(
    [{ contentHash, contentBytes: bytesToBase64(bytes) }],
    env,
  );
  return {
    name,
    description: [],
    partType: null,
    expression: null,
    contentHash,
    unresolved: true,
  };
}

const coreCall = async (
  partName: string,
  args: Readonly<Record<string, unknown>>,
): Promise<unknown> => ({
  "#call": {
    function: await partReference("", "core", partName),
    arguments: Object.entries(args).map(([name, value]) => ({ name, value })),
  },
});

const some = (value: unknown) => ({
  "#variant": {
    tag: "some",
    payload: { "#some": value },
    type_part: { "#none": null },
  },
});
const quoted = (expression: unknown) => ({
  "#record_get": { record: { "#quote": expression }, key: "expression" },
});

describe("ユーザーが作った定義のパーツ (docs/part-definition.md)", () => {
  /** app.define-number(description, value): 型が number で式が value の数のリテラルのパーツを定義する */
  const defineNumber = async () =>
    part(
      "define-number",
      {
        "#type_function": {
          parameters: [
            {
              name: "description",
              type: {
                "#type_list": {
                  item_type: {
                    "#part_reference": {
                      part_definition_event_hash: await deriveModulePartId(
                        await deriveModuleIdBytes("core"),
                        "localized-text",
                      ),
                    },
                  },
                },
              },
            },
            { name: "value", type: { "#type_number": null } },
          ],
          return_type: {
            "#part_reference": {
              part_definition_event_hash: await deriveModulePartId(
                await deriveModuleIdBytes("core"),
                "part-content",
              ),
            },
          },
        },
      },
      {
        "#function": {
          parameters: [
            { parameter_id: 0, parameter_name: "description" },
            { parameter_id: 1, parameter_name: "value" },
          ],
          body: await coreCall("define-part", {
            description: { "#variable": { variable_id: 0 } },
            visibility: {
              "#variant": {
                tag: "public",
                payload: { "#none": null },
                type_part: { "#none": null },
              },
            },
            part_type: some(quoted({ "#type_number": null })),
            expression: some({
              "#variant": {
                tag: "number",
                payload: { "#some": { "#variable": { variable_id: 1 } } },
                type_part: {
                  "#some": await deriveModulePartId(
                    await deriveModuleIdBytes("core"),
                    "expression",
                  ),
                },
              },
            }),
          }),
        },
      },
    );
  const callDefineNumber = async (args: Readonly<Record<string, unknown>>) => ({
    "#call": {
      function: await partReference("", "app", "define-number"),
      arguments: Object.entries(args).map(([name, value]) => ({ name, value })),
    },
  });

  it("定義の式はコミットの中の定義のパーツで評価し, その中身で型検査する", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const answer = await definedPart(
      store,
      env,
      "answer",
      await callDefineNumber({
        description: { "#list": [] },
        value: { "#number": 42 },
      }),
    );
    const double = part(
      "double",
      { "#type_number": null },
      await coreCall("plus", {
        left: await partReference("", "app", "answer"),
        right: await partReference("", "app", "answer"),
      }),
    );
    expect(
      await submitCommit(store, env, user, "app", [
        await defineNumber(),
        answer,
        double,
      ]),
    ).toEqual({ status: 200, message: "" });
    // 別のプロジェクトからも, 受け付けたコミットの中で評価した型で参照できる
    expect(
      await submitCommit(store, env, user, "other", [
        part(
          "half",
          { "#type_number": null },
          await coreCall("divide", {
            left: await partReference("", "app", "answer"),
            right: { "#number": 2 },
          }),
        ),
      ]),
    ).toEqual({ status: 200, message: "" });
    expect(
      (
        await submitCommit(store, env, user, "other2", [
          part(
            "wrong",
            { "#type_string": null },
            await partReference("", "app", "answer"),
          ),
        ])
      ).status,
    ).toBe(400);
  });

  it("定義の式も型検査し, 評価して core.part-content にならなければ拒否する", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    // 知らない引数を渡す定義の式は, 評価はできても型エラー
    const extra = await submitCommit(store, env, user, "app", [
      await defineNumber(),
      await definedPart(
        store,
        env,
        "answer",
        await callDefineNumber({
          description: { "#list": [] },
          value: { "#number": 42 },
          extra: { "#number": 1 },
        }),
      ),
    ]);
    expect(extra.status).toBe(400);
    expect(extra.message).toContain("app.answer (definition)");
    // 定義のパーツがコミットに無ければ評価できない
    const missing = await submitCommit(store, env, user, "lib", [
      await definedPart(
        store,
        env,
        "answer",
        await callDefineNumber({
          description: { "#list": [] },
          value: { "#number": 42 },
        }),
      ),
    ]);
    expect(missing.status).toBe(400);
    expect(missing.message).toContain(
      "is not a part definition that evaluates to a core.part-content",
    );
  });
});

describe("SubmitEvent の型検査", () => {
  it("型の合うコミットは受け付ける (他のモジュールのパーツの呼び出しも引数の型まで検査する)", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const system = await importAccountCredentials(
      bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED),
      "definy",
    );
    const result = await submitCommit(store, env, user, "app", [
      part("answer", { "#type_number": null }, { "#number": 42 }),
      part(
        "contains",
        { "#type_boolean": null },
        {
          "#call": {
            function: await partReference(
              system.accountId,
              "core",
              "list-contains-string",
            ),
            arguments: [
              {
                name: "list",
                value: { "#list": [{ "#string": "a" }] },
              },
              { name: "target", value: { "#string": "a" } },
              { name: "index", value: { "#number": 0 } },
            ],
          },
        },
      ),
    ]);
    expect(result).toEqual({ status: 200, message: "" });
  });

  it("未入力は全て推論できる型引数 (未確定の型引数) のときだけ受け付ける (docs/type-arguments.md)", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const system = await importAccountCredentials(
      bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED),
      "definy",
    );
    const hole = { "#hole": { probe: false } };
    const listOf = (itemType: unknown) => ({
      "#type_list": { item_type: itemType },
    });
    // core.list-map(T: □, U: □, f: (item) => item, xs: [1, 2])
    const mapIdentity = async (f: unknown) => ({
      "#call": {
        function: await partReference(system.accountId, "core", "list-map"),
        arguments: [
          { name: "T", value: hole },
          { name: "U", value: hole },
          { name: "f", value: f },
          {
            name: "xs",
            value: { "#list": [{ "#number": 1 }, { "#number": 2 }] },
          },
        ],
      },
    });
    const identity = {
      "#function": {
        parameters: [{ parameter_id: 1, parameter_name: "item" }],
        body: { "#variable": { variable_id: 1 } },
      },
    };
    expect(
      await submitCommit(store, env, user, "app", [
        part(
          "mapped",
          listOf({ "#type_number": null }),
          await mapIdentity(identity),
        ),
      ]),
    ).toEqual({ status: 200, message: "" });
    // 型引数でない位置 (f) の未入力は受け付けない
    expect(
      await submitCommit(store, env, user, "app2", [
        part(
          "mapped",
          listOf({ "#type_number": null }),
          await mapIdentity(hole),
        ),
      ]),
    ).toEqual({
      status: 400,
      message:
        "part 'app2.mapped': not supported: Expression has an unfilled hole",
    });
  });

  it("非公開のパーツ・他のプロジェクトの非公開のモジュールのパーツへの参照は拒否する (docs/visibility.md)", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    // lib プロジェクト: 公開の open と非公開の secret. 同じモジュールからは secret を参照できる
    expect(
      await submitCommit(store, env, user, "lib", [
        part("open", { "#type_number": null }, { "#number": 1 }),
        {
          ...part("secret", { "#type_number": null }, { "#number": 2 }),
          visibility: "private",
        },
        part(
          "uses-secret",
          { "#type_number": null },
          await partReference(user.accountId, "lib", "secret"),
        ),
      ]),
    ).toEqual({ status: 200, message: "" });
    // hidden プロジェクトの非公開のモジュール
    expect(
      await submitCommit(
        store,
        env,
        user,
        "hidden",
        [part("value", { "#type_number": null }, { "#number": 3 })],
        "hidden",
        "private",
      ),
    ).toEqual({ status: 200, message: "" });

    const app = (parts: ReadonlyArray<DecodedPart>) =>
      submitCommit(store, env, user, "app", parts);
    expect(
      await app([
        part(
          "a",
          { "#type_number": null },
          await partReference(user.accountId, "lib", "open"),
        ),
      ]),
    ).toEqual({ status: 200, message: "" });
    const privatePart = await app([
      part(
        "a",
        { "#type_number": null },
        await partReference(user.accountId, "lib", "secret"),
      ),
    ]);
    expect(privatePart.status).toBe(400);
    expect(privatePart.message).toContain(
      "part 'app.a': cannot reference the private part 'lib.secret'",
    );
    const privateModule = await app([
      part(
        "a",
        { "#type_number": null },
        await partReference(user.accountId, "hidden", "value"),
      ),
    ]);
    expect(privateModule.status).toBe(400);
    expect(privateModule.message).toContain("of a private module");
  }, 60_000);

  it("型エラーのあるコミットは 400 で拒否し, パーツ名と理由を返す", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const result = await submitCommit(store, env, user, "app", [
      part("ok", { "#type_number": null }, { "#number": 1 }),
      part("bad", { "#type_number": null }, { "#string": "not a number" }),
    ]);
    expect(result.status).toBe(400);
    expect(result.message).toContain(
      "part 'app.bad': type error: type_mismatch",
    );
    expect(result.message).not.toContain("part 'app.ok'");
  });

  it("型の無いパーツは一般のアカウントでは拒否する", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const result = await submitCommit(store, env, user, "app", [
      part("untyped", null, { "#number": 1 }),
    ]);
    expect(result.status).toBe(400);
    expect(result.message).toContain("part 'app.untyped': not supported");
  });

  it("パーツの型を変えると, それを参照する (式を変えていない) パーツも検査する", async () => {
    const { store, env } = await createSeededStore();
    const user = await generateAccountCredentials("user");
    const base = part("base", { "#type_number": null }, { "#number": 1 });
    const double = part(
      "double",
      { "#type_number": null },
      {
        "#call": {
          function: await resolvePartPlaceholders({
            "#part_reference": {
              part_definition_event_hash: { $part: "core.plus" },
            },
          }),
          arguments: [
            {
              name: "left",
              value: await partReference(user.accountId, "app", "base"),
            },
            { name: "right", value: { "#number": 1 } },
          ],
        },
      },
    );
    expect(
      (await submitCommit(store, env, user, "app", [base, double])).status,
    ).toBe(200);
    const result = await submitCommit(store, env, user, "app", [
      part("base", { "#type_string": null }, { "#string": "one" }),
      double,
    ]);
    expect(result.status).toBe(400);
    expect(result.message).toContain("part 'app.double': type error");
  });

  it("コンパイラ組み込みのパーツは定義の式で決まり, 名前やアカウントによらず受け付ける", async () => {
    const { store, env } = await createSeededStore();
    const system = await importAccountCredentials(
      bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED),
      "definy",
    );
    const seedParts = async (moduleName: string) => {
      const seed = JSON.parse(
        await readFile(`seeds/${moduleName}.json`, "utf8"),
      ) as {
        readonly parts: ReadonlyArray<{
          readonly name: string;
          readonly part_type?: unknown;
          readonly expression?: unknown;
        }>;
      };
      return await Promise.all(
        seed.parts.map(async (seedPart) =>
          part(
            // 組み込みかどうかは式 ({"#builtin": "not_equal"}) で決まり, 名前によらない.
            // 他のパーツが呼んでいる組み込みの名前を変えると, 呼んでいるパーツがパーツを見つけられなくなる
            // (core.not-equal は seed のどのパーツも呼んでいない)
            seedPart.name === "not-equal" ? "not-equal-renamed" : seedPart.name,
            await resolveSeedPartType(seedPart.part_type),
            await resolvePartPlaceholders(seedPart.expression ?? null),
          ),
        ),
      );
    };
    const parts = await seedParts("core");
    expect(
      parts.find((p) => p.name === "not-equal-renamed")?.expression,
    ).toEqual({
      "#builtin": "not_equal",
    });
    // core は seed の definy プロジェクトのモジュール
    expect(
      // core のコンパイラは wasm モジュールのパーツを使うので, 同じプロジェクトの wasm も一緒にコミットする
      await submitCommit(
        store,
        env,
        system,
        "core",
        parts,
        "definy",
        "public",
        [{ name: "wasm", description: [], parts: await seedParts("wasm") }],
      ),
    ).toEqual({
      status: 200,
      message: "",
    });

    // 一般のアカウントのモジュールでも, 定義の式がコンパイラ組み込みなら受け付ける
    const user = await generateAccountCredentials("user");
    expect(
      await submitCommit(store, env, user, "app", [
        part("string-concat", null, { "#builtin": "string_concat" }),
      ]),
    ).toEqual({ status: 200, message: "" });
    // 組み込みでなく型の無いパーツは拒否する
    const result = await submitCommit(store, env, user, "app", [
      part("untyped", null, { "#number": 1 }),
    ]);
    expect(result.status).toBe(400);
    expect(result.message).toContain("part 'app.untyped': not supported");
  }, 60_000);
});
