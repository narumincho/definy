import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { CommitSummary } from "../src/event_check.ts";
import { none, some, variant } from "../src/definy_value.ts";
import { bytesToBase64, bytesToUrlSafeBase64NoPad } from "../src/base64.ts";
import { encodeCborItem } from "../src/cbor.ts";
import { generateAccountCredentials } from "../src/auth.ts";
import { createRpcAuthorization } from "../src/rpc_auth.ts";
import { verifyEd25519 } from "./ed25519.ts";
import {
  encodeEventContent,
  type CommitModule,
  type CommitPart,
  type EventContent,
  type PartContent,
} from "../src/event_content.ts";
import {
  definyToJson,
  handleRequestInDefiny,
  jsonToDefiny,
  type HttpHeader,
  type ServiceIoHost,
  type SqlStatement,
} from "./service_io.ts";
import { runD1Statements, WorkerStore } from "./store.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { partDefinitionExpression } from "../src/part_definition.ts";
import type { ContentItem, D1Database, EventItem } from "./types.ts";

const service = new WebAssembly.Module(await readFile("wasm/service.wasm"));

/** RPC `/definy.v1.<method>` を本文 `request` で `definy.handle-request` に処理させ, JSON のレスポンスを返す */
async function handleRpcInDefiny(
  module: WebAssembly.Module,
  method: string,
  request: () => unknown,
  rpcHost: ServiceIoHost,
  headers: ReadonlyArray<HttpHeader> = [],
): Promise<{ readonly status: number; readonly body: unknown }> {
  const result = await handleRequestInDefiny(
    module,
    {
      method: "POST",
      path: `/definy.v1.${method}`,
      headers,
      storage: "in-memory",
      hasAssets: false,
    },
    {
      ...rpcHost,
      readSeedStatus: () =>
        Promise.resolve({ seeded: true, expectedFingerprint: "" }),
      readRequestJson: () => Promise.resolve({ json: request() }),
      readRequestText: () => Promise.resolve(JSON.stringify(request())),
    },
  );
  if (result.type !== "respond" || result.body.type !== "json") {
    throw new Error(`not a JSON response: ${JSON.stringify(result)}`);
  }
  return { status: result.status, body: result.body.json };
}

const commit = (
  eventHash: string,
  accountId: string,
  branch: string,
  timeMs: number,
): CommitSummary => ({
  eventHash,
  accountId,
  projectName: "app",
  branch,
  timeMs,
  moduleNames: ["app"],
});

/** 型検査するコミットのパーツ (中身が `null` なら core.part-content に評価できなかったもの) */
type CheckPart = {
  readonly name: string;
  readonly contentHash: string;
  /** 中身の定義の式 (`option<core.expression>`) */
  readonly definition: unknown;
};

const checkPart = (
  name: string,
  content: PartContent | null,
  contentHash = `hash-${name}`,
): CheckPart => ({
  name,
  contentHash,
  definition:
    content === null ? none() : some(partDefinitionExpression(content)),
});

/** 型環境にするプロジェクトの main の最新のコミットのパーツ (`definy.stored-commit-part` と定義の式) */
type LibPart = {
  readonly id: string;
  readonly name: string;
  readonly module_name: string;
  readonly module_id: string;
  readonly module_visibility: unknown;
  readonly content_hash: string;
  readonly definition: unknown;
};

/** 型検査するコミット (プロジェクト `app` を作るコミット) と型環境 */
type CheckInput = {
  readonly parts: ReadonlyArray<CheckPart>;
  /** 型環境にする各プロジェクトの main の最新のコミット */
  readonly latestCommits?: ReadonlyArray<{
    readonly project_name: string;
    readonly parts: ReadonlyArray<LibPart>;
  }>;
};

const checkInput = (input: CheckInput): CheckInput => input;

/** プロジェクト `lib` の main の最新のコミットのパーツ */
const libPart = (name: string, content: PartContent): LibPart => ({
  id: `id-${name}`,
  name: `lib.${name}`,
  module_name: "lib",
  module_id: "module-lib",
  module_visibility: variant("public"),
  content_hash: `hash-lib-${name}`,
  definition: some(partDefinitionExpression(content)),
});

const content = (partType: unknown, expression: unknown): PartContent => ({
  description: [],
  visibility: "public",
  partType,
  expression,
});

const event = (eventHash: string, timeMs = 0): EventItem => ({
  eventHash,
  signedEventBytes: `signed-${eventHash}`,
  accountId: "alice",
  eventType: "project_commit",
  createdAtRfc3339: "2026-10-27T00:00:00Z",
  timeMs,
});

/** `accountIds` の `create_account` のイベント (新しい順に `accountIds` の順) */
const createdAccounts = (
  accountIds: ReadonlyArray<string>,
): ReadonlyArray<EventItem> =>
  accountIds.map((accountId, i) => ({
    ...event(`account-${i}`, accountIds.length - i),
    accountId,
    eventType: "create_account",
  }));

/** 実行した SQL の文の短い説明 (動詞, 表, パラメーター. 長い文字列は …) */
const sqlLabel = (statement: SqlStatement): string =>
  [
    statement.sql.split(" ")[0],
    /(?:FROM|INTO) (\w+)/.exec(statement.sql)?.[1],
    statement.params
      .map((param) =>
        typeof param === "string" && param.length > 20 ? "…" : String(param),
      )
      .join(","),
  ].join(" ");

/**
 * テストのストア (sqlite の D1. `events` と `contents` を入れておく).
 * definy が `sql` で実行した文を `log` に `sql <文の説明>; ...` として足す
 */
async function sqlStore(
  fixtures: {
    readonly events?: ReadonlyArray<EventItem>;
    readonly contents?: ReadonlyArray<ContentItem>;
    /** プロジェクトのコミット. イベントを入れ, 読んだものはホストが覚えていることにする (`read_cached_commits`) */
    readonly commits?: ReadonlyArray<CommitSummary>;
  } = {},
  log: Array<string> = [],
): Promise<{
  readonly db: D1Database;
  readonly host: Pick<
    ServiceIoHost,
    | "runSql"
    | "readCachedCommits"
    | "readCachedDefinitions"
    | "writeCachedDefinitions"
  >;
}> {
  const commits = fixtures.commits ?? [];
  fixtures = {
    ...fixtures,
    events: [
      ...(fixtures.events ?? []),
      ...commits.map((summary) => ({
        ...event(summary.eventHash, summary.timeMs),
        accountId: summary.accountId,
      })),
    ],
  };
  const db = createSqliteD1Database();
  // テーブルは definy (definy.seed-store) が作る. 指紋の行は消しておく
  await new WorkerStore().seedD1(db, { events: [], contents: [] });
  await db.prepare("DELETE FROM cas_contents").run();
  for (const item of fixtures.events ?? []) {
    await db
      .prepare(
        "INSERT INTO events (event_hash, signed_event_bytes, account_id, event_type, created_at_rfc3339, time_ms) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(
        item.eventHash,
        item.signedEventBytes,
        item.accountId,
        item.eventType,
        item.createdAtRfc3339,
        item.timeMs,
      )
      .run();
  }
  for (const item of fixtures.contents ?? []) {
    await db
      .prepare(
        "INSERT INTO cas_contents (content_hash, content_bytes) VALUES (?, ?)",
      )
      .bind(item.contentHash, item.contentBytes)
      .run();
  }
  return {
    db,
    host: {
      runSql: (statements) => {
        log.push(["sql", ...statements.map(sqlLabel)].join(" ").trim());
        return runD1Statements(db, statements);
      },
      // 定義の式は覚えていないことにする (definy が CAS から読んで覚える)
      readCachedDefinitions: () => Promise.resolve([]),
      writeCachedDefinitions: (entries) => {
        log.push(
          `cache definitions ${entries.map((entry) => entry.content_hash).join(",")}`,
        );
        return Promise.resolve();
      },
      readCachedCommits: (eventHashes) => {
        log.push(`cached ${eventHashes.join(",")}`);
        return Promise.resolve(
          commits
            .filter((summary) => eventHashes.includes(summary.eventHash))
            .map((summary) => ({
              event_hash: summary.eventHash,
              commit: some({
                account_id: summary.accountId,
                project_name: summary.projectName,
                branch: summary.branch,
                time_ms: summary.timeMs,
                modules: summary.moduleNames.map((name) => ({
                  name,
                  id: `module-${name}`,
                  parts: [],
                })),
              }),
            })),
        );
      },
    },
  };
}

/** テストのイベントを出したアカウントの公開鍵 (署名は確かめないので何でも良い) */
const ALICE_PUBLIC_KEY = new Uint8Array(32).fill(7);
const alice = bytesToUrlSafeBase64NoPad(ALICE_PUBLIC_KEY);

/** {@link signedEvent} の署名した内側のイベント (時刻は 1000 秒) */
const signedEventInner = (content: EventContent): Uint8Array =>
  encodeCborItem({
    account_id: ALICE_PUBLIC_KEY,
    time: { __tag: 1, value: 1000 },
    content: encodeEventContent(content),
  });

const signedEventInnerLength = (content: EventContent): number =>
  signedEventInner(content).length;

/** `alice` が `content` を出した SignedEvent (Base64). 署名は 0 で埋める ({@link verifyingHost} が正しいとする) */
const signedEvent = (content: EventContent): string =>
  bytesToBase64(
    encodeCborItem({
      signature: new Uint8Array(64),
      event_binary: { __tag: 24, value: signedEventInner(content) },
    }),
  );

/** `definy.verify-signed-event` が使う能力. 署名は正しいとし, イベントハッシュは `eventHash` */
const verifyingHost = (eventHash: string): Partial<ServiceIoHost> => ({
  verifyEd25519: () => Promise.resolve(true),
  now: () => 1_000_000,
  hashContents: (contents) => Promise.resolve(contents.map(() => eventHash)),
});

/** 読まないはずのホスト. `overrides` で読むものだけ与える */
const host = (overrides: Partial<ServiceIoHost> = {}): ServiceIoHost => ({
  readCachedCommits: () => Promise.reject(new Error("not read")),
  writeCachedCommits: () => Promise.reject(new Error("not written")),
  runSql: () => Promise.reject(new Error("not read")),
  verifyEd25519: () => Promise.reject(new Error("not verified")),
  now: () => {
    throw new Error("not read");
  },
  readCachedDefinitions: () => Promise.reject(new Error("not read")),
  writeCachedDefinitions: () => Promise.reject(new Error("not written")),
  hashContents: () => Promise.reject(new Error("not hashed")),
  readRequestText: () => Promise.reject(new Error("not read")),
  readAdminAccountIds: () => {
    throw new Error("not read");
  },
  httpFetch: () => Promise.reject(new Error("not fetched")),
  readSeedStatus: () => Promise.reject(new Error("not read")),
  readSeedBundle: () => Promise.reject(new Error("not read")),
  markSeeded: () => {
    throw new Error("not seeded");
  },
  readRequestJson: () => Promise.reject(new Error("not read")),
  ...overrides,
});

/**
 * `alice` がプロジェクト `app` を作るコミット (`input.parts`) を SubmitEvent で出す.
 * 中身は CAS にあり, 定義の式と型環境のコミットはホストが覚えていることにする
 * (`read_cached_definitions` / `read_cached_commits`). 型検査は definy (`definy.check-commit`) が行う
 */
async function submitCheckedCommit(
  eventHash: string,
  input: CheckInput,
): Promise<{ readonly status: number; readonly body: unknown }> {
  const latestCommits = input.latestCommits ?? [];
  const latestHash = (index: number) => `latest-${index}`;
  const definitions = new Map<string, unknown>([
    ...input.parts.map((part) => [part.contentHash, part.definition] as const),
    ...latestCommits.flatMap((latest) =>
      latest.parts.map((part) => [part.content_hash, part.definition] as const),
    ),
  ]);
  const store = await sqlStore({
    events: [
      ...createdAccounts([alice]),
      ...latestCommits.map((_, i) => event(latestHash(i), 10 + i)),
    ],
    contents: input.parts.map((part) => ({
      contentHash: part.contentHash,
      contentBytes: "AA==",
    })),
  });
  return handleRpcInDefiny(
    service,
    "EventService/SubmitEvent",
    () => ({
      signedEventBytes: signedEvent({
        type: "project_commit",
        commit: {
          projectName: "app",
          branch: "main",
          projectDescription: [],
          message: "",
          parentCommitHash: null,
          mergedCommitHash: null,
          modules: [
            {
              name: "app",
              description: [],
              parts: input.parts.map((part) => ({
                name: part.name,
                description: [],
                partType: null,
                expression: null,
                contentHash: part.contentHash,
              })),
            },
          ],
        },
      }),
    }),
    host({
      ...verifyingHost(eventHash),
      ...store.host,
      readCachedCommits: (eventHashes) =>
        Promise.resolve(
          latestCommits.flatMap((latest, i) =>
            eventHashes.includes(latestHash(i))
              ? [
                  {
                    event_hash: latestHash(i),
                    commit: some({
                      account_id: "alice",
                      project_name: latest.project_name,
                      branch: "main",
                      time_ms: 10 + i,
                      modules: [
                        {
                          name: latest.project_name,
                          id: `module-${latest.project_name}`,
                          parts: latest.parts.map((part) => ({
                            id: part.id,
                            name: part.name,
                            module_name: part.module_name,
                            module_id: part.module_id,
                            module_visibility: part.module_visibility,
                            content_hash: part.content_hash,
                          })),
                        },
                      ],
                    }),
                  },
                ]
              : [],
          ),
        ),
      readCachedDefinitions: (contentHashes) =>
        Promise.resolve(
          contentHashes.flatMap((contentHash) =>
            definitions.has(contentHash)
              ? [
                  {
                    content_hash: contentHash,
                    definition: definitions.get(contentHash),
                  },
                ]
              : [],
          ),
        ),
      writeCachedDefinitions: () => Promise.resolve(),
    }),
  );
}

describe("handleRpcInDefiny", () => {
  it("GetProjectBranches はブランチと最新のイベントを返す", async () => {
    const reads: Array<string> = [];
    const store = await sqlStore(
      {
        commits: [
          commit("m1", "alice", "main", 100),
          commit("b1", "bob", "bob", 200),
          commit("m2", "alice", "main", 300),
        ],
      },
      reads,
    );
    const branchesHost = host(store.host);
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/GetProjectBranches",
        () => ({}),
        branchesHost,
      ),
    ).toEqual({
      status: 200,
      body: {
        branches: [
          {
            projectName: "app",
            branch: "main",
            creatorAccountId: "alice",
            commitCount: 2,
            latestEvent: event("m2", 300),
          },
          {
            projectName: "app",
            branch: "bob",
            creatorAccountId: "bob",
            commitCount: 1,
            latestEvent: { ...event("b1", 200), accountId: "bob" },
          },
        ],
      },
    });
    // コミットは definy が読む (読んだものはホストが覚えている)
    expect(reads).toEqual([
      "sql SELECT events project_commit,500,0",
      "cached m2,b1,m1",
      "sql SELECT events m2,b1",
    ]);
  });

  it("無いメソッドは unimplemented で, 本文を読まない", async () => {
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/Unknown",
        () => {
          throw new Error("not read");
        },
        host(),
      ),
    ).toEqual({
      status: 404,
      body: {
        code: "unimplemented",
        message: "Endpoint /definy.v1.EventService/Unknown is not implemented",
      },
    });
  });

  it("SubmitEvent は署名を確かめ, 規則・足りない中身・型チェッカーの順に見てから保存する", async () => {
    const steps: Array<string> = [];
    const createAccount: EventContent = {
      type: "create_account",
      accountName: "alice",
    };
    const signed = signedEvent(createAccount);
    let db: D1Database | undefined;
    const submitHost = async (
      overrides: Partial<ServiceIoHost> = {},
      events: ReadonlyArray<EventItem> = [],
    ): Promise<ServiceIoHost> => {
      const store = await sqlStore({ events }, steps);
      db = store.db;
      return host({
        ...verifyingHost("e1"),
        ...store.host,
        verifyEd25519: (publicKey, _signature, message) => {
          steps.push(`verify ${publicKey.length} ${message.length}`);
          return Promise.resolve(true);
        },
        ...overrides,
      });
    };
    const submit = async (
      request: unknown,
      h: ServiceIoHost | Promise<ServiceIoHost>,
    ) =>
      handleRpcInDefiny(
        service,
        "EventService/SubmitEvent",
        () => request,
        await h,
      );

    expect(
      await submit({ signedEventBytes: ` ${signed}\n` }, submitHost()),
    ).toEqual({
      status: 200,
      body: { eventHash: "e1", status: "accepted", missingContentHashes: [] },
    });
    const innerLength = signedEventInnerLength(createAccount);
    expect(steps).toEqual([
      `verify 32 ${innerLength}`,
      "sql SELECT events create_account,500,0",
      // CAS に足りない中身 (create_account には中身が無いので文も無い)
      "sql",
      "sql INSERT events e1,…,…,create_account,1000000,1000000",
    ]);
    // created_at_rfc3339 は definy が SQL で time_ms から作る
    expect(
      await db!.prepare("SELECT * FROM events").all<Record<string, unknown>>(),
    ).toMatchObject({
      results: [
        {
          event_hash: "e1",
          signed_event_bytes: signed,
          account_id: alice,
          event_type: "create_account",
          created_at_rfc3339: "1970-01-01T00:16:40.000Z",
          time_ms: 1_000_000,
        },
      ],
    });

    expect(
      await submit(
        { signedEventBytes: signed },
        submitHost({}, createdAccounts([alice])),
      ),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "the account has already been created",
      },
    });
    const rejected = (message: string) => ({
      status: 400,
      body: { code: "invalid_argument", message },
    });
    expect(
      await submit(
        { signedEventBytes: signed },
        submitHost({ verifyEd25519: () => Promise.resolve(false) }),
      ),
    ).toEqual(rejected("Ed25519 signature verification failed"));
    // 署名時刻 (1000 秒) が今より 10 分を超えて先
    expect(
      await submit(
        { signedEventBytes: signed },
        submitHost({ now: () => 1_000_000 - 600_001 }),
      ),
    ).toEqual(rejected("event time is too far in the future"));
    expect(
      await submit({ signedEventBytes: "not base64!" }, submitHost()),
    ).toEqual(rejected("signedEventBytes must be Base64"));
    expect(await submit({ signedEventBytes: "AAAA" }, submitHost())).toEqual(
      rejected("trailing bytes after SignedEvent"),
    );
    expect(await submit({ signedEventBytes: " " }, host())).toEqual(
      rejected("signedEventBytes is required"),
    );
  });

  it("SubmitEvent はプロジェクトのコミットなら受け付けたコミットも読んで規則 (core.check-event) で検査する", async () => {
    const part = (name: string): CommitPart => ({
      name,
      description: [],
      partType: null,
      expression: null,
      contentHash: `hash-${name}`,
    });
    const projectCommit = (options: {
      readonly parent: string | null;
      readonly modules: ReadonlyArray<CommitModule>;
    }): EventContent => ({
      type: "project_commit",
      commit: {
        projectName: "app",
        branch: "main",
        projectDescription: [],
        message: "",
        parentCommitHash: options.parent,
        mergedCommitHash: null,
        modules: options.modules,
      },
    });
    // 中身 (CAS) は数 1 の定義の式の CBOR
    const numberDefinitionBytes = bytesToBase64(
      encodeCborItem(
        partDefinitionExpression(
          content({ "#type_number": null }, { "#number": 1 }),
        ),
      ),
    );
    const reads: Array<string> = [];
    const submitCommit = async (
      content: EventContent,
      contents: ReadonlyArray<ContentItem> = [],
    ) =>
      handleRpcInDefiny(
        service,
        "EventService/SubmitEvent",
        () => ({ signedEventBytes: signedEvent(content) }),
        host({
          ...verifyingHost("e2"),
          ...(
            await sqlStore(
              {
                events: createdAccounts([alice]),
                contents,
                commits: [commit("m1", alice, "main", 100)],
              },
              reads,
            )
          ).host,
        }),
      );
    const commitX = projectCommit({
      parent: "m1",
      modules: [
        { name: "app", description: [], parts: [part("x"), part("x2")] },
      ],
    });

    // CAS に無い中身があれば保存しない
    expect(
      await submitCommit(commitX, [
        { contentHash: "hash-x2", contentBytes: "AA==" },
      ]),
    ).toEqual({
      status: 200,
      body: {
        eventHash: "e2",
        status: "missing_content",
        missingContentHashes: ["hash-x"],
      },
    });
    expect(reads).toEqual([
      "sql SELECT events create_account,500,0",
      "sql SELECT events project_commit,500,0",
      "cached m1",
      "sql SELECT cas_contents hash-x,hash-x2",
    ]);

    reads.length = 0;
    expect(
      await submitCommit(
        commitX,
        ["hash-x", "hash-x2"].map((contentHash) => ({
          contentHash,
          contentBytes: numberDefinitionBytes,
        })),
      ),
    ).toEqual({
      status: 200,
      body: { eventHash: "e2", status: "accepted", missingContentHashes: [] },
    });
    expect(reads).toEqual([
      "sql SELECT events create_account,500,0",
      "sql SELECT events project_commit,500,0",
      "cached m1",
      "sql SELECT cas_contents hash-x,hash-x2",
      // 型検査の入力 (definy.read-commit-check-input): main の最新のコミットと, 定義の式を CAS から読んで覚える
      "sql SELECT events project_commit,500,0",
      "cached m1",
      "sql SELECT cas_contents hash-x,hash-x2",
      "cache definitions hash-x,hash-x2",
      "sql INSERT events e2,…,…,project_commit,1000000,1000000",
    ]);

    expect(
      await submitCommit(
        projectCommit({
          parent: null,
          modules: [
            { name: "app", description: [], parts: [part("x"), part("x")] },
            { name: "core", description: [], parts: [part("y")] },
          ],
        }),
      ),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: [
          "parent_commit_hash must be the latest commit of the branch, or a commit of the project for a new branch (fetch the latest events and commit again)",
          "the part name 'x' is duplicated",
        ].join("\n"),
      },
    });
  });

  it("SubmitEvent の型検査は definy.check-commit が service.wasm の中で型チェッカーを呼んで行う", async () => {
    const submitWith = (input: CheckInput) => submitCheckedCommit("e3", input);
    const number = { "#type_number": null };
    const reference = (id: string) => ({
      "#part_reference": { part_definition_event_hash: id },
    });
    const listOfNumber = { "#type_list": { item_type: number } };
    const numberToNumber = {
      "#type_function": {
        parameters: [{ name: "value", type: number }],
        return_type: number,
      },
    };

    // 式の無いパーツ (組み込みは除く) を先に, 型エラーをその後に並べる
    expect(
      await submitWith(
        checkInput({
          parts: [
            checkPart("x", content(number, { "#string": "a" })),
            checkPart("y", content(number, null)),
            checkPart("plus", content(null, { "#builtin": "plus" })),
            checkPart("list", content(listOfNumber, { "#number": 1 })),
            checkPart(
              "f",
              content(numberToNumber, {
                "#record": [{ key: "a", value: { "#number": 1 } }],
              }),
            ),
            checkPart(
              "v",
              content(number, { "#variable": { variable_id: 7 } }),
            ),
            checkPart("hole", content(number, { "#hole": { probe: false } })),
          ],
        }),
      ),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: [
          "part 'app.y': not supported: part has no expression or type",
          "part 'app.x': type error: type_mismatch (expected: number, actual: string)",
          "part 'app.list': type error: type_mismatch (expected: List<number>, actual: number)",
          "part 'app.f': type error: type_mismatch (expected: (value: number) -> number, actual: { a: number })",
          "part 'app.v': type error: undefined_variable (variable_id: 7)",
          "part 'app.hole': not supported: Expression has an unfilled hole",
        ].join("\n"),
      },
    });

    // 中身が定義の式でなければ拒否する
    expect(
      await submitWith(checkInput({ parts: [checkPart("x", null, "c1")] })),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message:
          "app.x: the content c1 is not a part definition that evaluates to a core.part-content",
      },
    });

    // 参照できないパーツへの参照は, 型を検査する前に拒否する
    expect(
      await submitWith(
        checkInput({
          parts: [checkPart("x", content(number, reference("id-secret")))],
          latestCommits: [
            {
              project_name: "lib",
              parts: [
                libPart("secret", {
                  ...content(number, { "#number": 1 }),
                  visibility: "private",
                }),
              ],
            },
          ],
        }),
      ),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "part 'app.x': cannot reference the private part 'lib.secret'",
      },
    });

    // 型環境 (main の最新のコミット) の定義の式も definy が読む
    const lib = [
      {
        project_name: "lib",
        parts: [libPart("n", content(number, { "#number": 1 }))],
      },
    ];
    expect(
      await submitWith(
        checkInput({
          parts: [
            checkPart("x", content(number, reference("id-n"))),
            checkPart(
              "s",
              content({ "#type_string": null }, reference("id-n")),
            ),
          ],
          latestCommits: lib,
        }),
      ),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message:
          "part 'app.s': type error: type_mismatch (expected: string, actual: number)",
      },
    });

    expect(
      await submitWith(
        checkInput({
          parts: [checkPart("x", content(number, { "#number": 1 }))],
        }),
      ),
    ).toEqual({
      status: 200,
      body: { eventHash: "e3", status: "accepted", missingContentHashes: [] },
    });
  });

  it("SubmitEvent はパーツの定義の式を definy がその場で読むか, 評価器 (core.eval-value) で評価して読む", async () => {
    const submitWith = (parts: ReadonlyArray<CheckPart>) =>
      submitCheckedCommit("e4", { parts });
    // core.define-part / core.define-type の呼び出しは評価器を使わずに読む
    expect(
      await submitWith([
        checkPart("color", {
          description: [{ language: "en", text: "A color" }],
          visibility: "private",
          partType: { "#type_type": null },
          expression: {
            "#type_union": [
              { tag: "red", payload_type: { "#none": null } },
              { tag: "green", payload_type: { "#none": null } },
            ],
          },
        }),
        checkPart("x", content({ "#type_number": null }, { "#number": 1 })),
      ]),
    ).toEqual({
      status: 200,
      body: { eventHash: "e4", status: "accepted", missingContentHashes: [] },
    });

    // それ以外は評価器で評価し, 値を definy (core.value-to-part-content) が core.part-content にする
    expect(
      await submitWith([
        {
          ...checkPart("y", null),
          definition: some({ "#number": 1 }),
        },
      ]),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message:
          "app.y: the content hash-y is not a part definition that evaluates to a core.part-content",
      },
    });
    const field = (key: string, value: unknown) => ({ key, value });
    const option = (value: unknown) => ({
      "#variant": {
        tag: value === undefined ? "none" : "some",
        payload: value === undefined ? { "#none": null } : { "#some": value },
        type_part: { "#none": null },
      },
    });
    const quoted = (expression: unknown) => ({
      "#record_get": { record: { "#quote": expression }, key: "expression" },
    });
    expect(
      await submitWith([
        {
          ...checkPart("z", null),
          definition: some({
            "#record": [
              field("description", { "#list": [] }),
              field("visibility", {
                "#variant": {
                  tag: "public",
                  payload: { "#none": null },
                  type_part: { "#none": null },
                },
              }),
              field("part_type", option(quoted({ "#type_number": null }))),
              field(
                "expression",
                option(quoted({ "#string": "not a number" })),
              ),
            ],
          }),
        },
      ]),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        // 評価器で求めたパーツは定義の式も型検査する (空のリストは型が決まらない)
        message: [
          "part 'app.z (definition)': type error: cannot_infer_empty_list",
          "part 'app.z': type error: type_mismatch (expected: number, actual: string)",
        ].join("\n"),
      },
    });
  });

  it("SubmitEvent はアカウントを作ったかを create_account のイベントを 500 件ずつ読んで求める", async () => {
    const reads: Array<string> = [];
    const submitCreateAccount = async (accountIds: ReadonlyArray<string>) =>
      handleRpcInDefiny(
        service,
        "EventService/SubmitEvent",
        () => ({
          signedEventBytes: signedEvent({
            type: "create_account",
            accountName: "alice",
          }),
        }),
        host({
          ...verifyingHost("e5"),
          ...(await sqlStore({ events: createdAccounts(accountIds) }, reads))
            .host,
        }),
      );
    const others = Array.from({ length: 500 }, (_, i) => `bob-${i}`);
    expect(await submitCreateAccount([...others, alice])).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "the account has already been created",
      },
    });
    const pages = [
      "sql SELECT events create_account,500,0",
      "sql SELECT events create_account,500,500",
    ];
    expect(reads).toEqual(pages);

    reads.length = 0;
    expect(await submitCreateAccount(others)).toEqual({
      status: 200,
      body: { eventHash: "e5", status: "accepted", missingContentHashes: [] },
    });
    expect(reads.slice(0, 2)).toEqual(pages);
  });

  it("UploadContent は SHA-256 が content hash と一致するときだけ保存する", async () => {
    const store = await sqlStore();
    const uploadHost = host({
      ...store.host,
      hashContents: (contents) =>
        Promise.resolve(
          contents.map((bytes) =>
            bytes === "not base64" ? undefined : `hash-of-${bytes}`,
          ),
        ),
    });
    const written = async () =>
      (await store.db.prepare("SELECT * FROM cas_contents").all()).results;
    const upload = (request: unknown) =>
      handleRpcInDefiny(
        service,
        "EventService/UploadContent",
        () => request,
        uploadHost,
      );
    const item = (contentHash: string, contentBytes: string) => ({
      contentHash,
      contentBytes,
    });

    expect(
      await upload({ items: [item("hash-of-a", "a"), item("hash-of-b", "b")] }),
    ).toEqual({
      status: 200,
      body: { storedContentHashes: ["hash-of-a", "hash-of-b"] },
    });
    const stored = [
      { content_hash: "hash-of-a", content_bytes: "a" },
      { content_hash: "hash-of-b", content_bytes: "b" },
    ];
    expect(await written()).toEqual(stored);
    expect(await upload({})).toEqual({
      status: 200,
      body: { storedContentHashes: [] },
    });

    expect(
      await upload({ items: [item("hash-of-c", "c"), item("x", "b")] }),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message:
          "contentHash 'x' does not match SHA-256 of contentBytes ('hash-of-b')",
      },
    });
    expect(await upload({ items: [item("y", "not base64")] })).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "contentBytes of 'y' is not Base64",
      },
    });
    expect(await upload({ items: [{ contentHash: "z" }] })).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "items must be a list of {contentHash, contentBytes}",
      },
    });
    expect(await written()).toEqual(stored);
  });

  it("GetEvent は両端の空白を除いたハッシュのイベントを返し, 無ければ not_found, 空なら invalid_argument", async () => {
    const eventHost = host((await sqlStore({ events: [event("e1", 5)] })).host);
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/GetEvent",
        () => ({ eventHash: " e1\n" }),
        eventHost,
      ),
    ).toEqual({ status: 200, body: { event: event("e1", 5) } });
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/GetEvent",
        () => ({ eventHash: "e2" }),
        eventHost,
      ),
    ).toEqual({
      status: 404,
      body: { code: "not_found", message: "Event 'e2' not found" },
    });
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/GetEvent",
        () => ({}),
        host(),
      ),
    ).toEqual({
      status: 400,
      body: { code: "invalid_argument", message: "eventHash is required" },
    });
  });

  it("GetEvents は limit を 1 から 500 に, offset を 0 以上にし, 空の eventType は指定しない", async () => {
    const pages: Array<string> = [];
    const pageHost = host(
      (await sqlStore({ events: [event("e1"), event("e2", 1)] }, pages)).host,
    );
    for (const [request, events] of [
      [{}, [event("e2", 1), event("e1")]],
      [
        { eventType: "", limit: 1000, offset: -3 },
        [event("e2", 1), event("e1")],
      ],
      [{ eventType: "project_commit", limit: 0, offset: 1 }, [event("e1")]],
      [{ eventType: "projectCommit", offset: 1 }, [event("e1")]],
      [{ eventType: "create_account" }, []],
    ] as const) {
      expect(
        await handleRpcInDefiny(
          service,
          "EventService/GetEvents",
          () => request,
          pageHost,
        ),
      ).toEqual({ status: 200, body: { events } });
    }
    expect(pages).toEqual([
      "sql SELECT events 50,0",
      "sql SELECT events 500,0",
      "sql SELECT events project_commit,1,1",
      "sql SELECT events projectCommit,50,1",
      "sql SELECT events create_account,50,0",
    ]);
  });

  it("GetContent は contentHash の中身か, contentHashes のうち見つかった中身を返す", async () => {
    const item = { contentHash: "c1", contentBytes: "AAEC" };
    const contentHost = host((await sqlStore({ contents: [item] })).host);
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/GetContent",
        () => ({ contentHash: "c1" }),
        contentHost,
      ),
    ).toEqual({ status: 200, body: { item } });
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/GetContent",
        () => ({ contentHash: "c2" }),
        contentHost,
      ),
    ).toEqual({
      status: 404,
      body: { code: "not_found", message: "Content 'c2' not found" },
    });
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/GetContent",
        () => ({ contentHashes: ["c2", "c1"] }),
        contentHost,
      ),
    ).toEqual({ status: 200, body: { items: [item] } });
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/GetContent",
        () => ({}),
        host(),
      ),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "contentHash or contentHashes is required",
      },
    });
  });

  it("CheckMissingHashes は CAS に無いハッシュを返す", async () => {
    expect(
      await handleRpcInDefiny(
        service,
        "EventService/CheckMissingHashes",
        () => ({ contentHashes: ["a", "b", "c", "b"] }),
        host(
          (
            await sqlStore({
              contents: [{ contentHash: "a", contentBytes: "AA==" }],
            })
          ).host,
        ),
      ),
    ).toEqual({ status: 200, body: { missingContentHashes: ["b", "c"] } });
  });

  it("HttpProxyService/Fetch は管理者の署名があるときだけ, 送らないヘッダーを除いて送る", async () => {
    const sent: Array<unknown> = [];
    const proxyHost = host({
      // 署名は正しいとする (署名を確かめるのは下の Authorization のテスト)
      verifyEd25519: () => Promise.resolve(true),
      now: () => 1_800_000_000_000,
      readAdminAccountIds: () => " 0123456789abcdef,FEEDBEEF-cafe_babe;\nzz ",
      httpFetch: (request) => {
        sent.push(request);
        return Promise.resolve({
          status: 201,
          headers: [{ name: "x-test", value: "1" }],
          bodyBase64: "AGFzbQ",
        });
      },
    });
    const fetchWith = (
      request: unknown,
      authorization:
        string | null = "Definy-Ed25519 FEEDBEEF-cafe_babe.1800000000.AAAA",
    ) =>
      handleRpcInDefiny(
        service,
        "HttpProxyService/Fetch",
        () => request,
        proxyHost,
        authorization === null
          ? []
          : [{ name: "authorization", value: authorization }],
      );
    const request = {
      method: " put ",
      url: " https://api.cloudflare.com/client/v4/x ",
      headers: [
        { name: "Authorization", value: "Bearer cf-token" },
        { name: "Content-Length", value: "4" },
        { name: "HOST", value: "example.com" },
        { name: "broken" },
      ],
      bodyBase64: "AGFzbQ",
    };
    expect(await fetchWith(request)).toEqual({
      status: 200,
      body: {
        status: 201,
        headers: [{ name: "x-test", value: "1" }],
        bodyBase64: "AGFzbQ",
      },
    });
    expect(sent).toEqual([
      {
        url: "https://api.cloudflare.com/client/v4/x",
        method: "PUT",
        headers: [{ name: "Authorization", value: "Bearer cf-token" }],
        bodyBase64: "AGFzbQ",
      },
    ]);

    // GET は本文を送らない. method が無ければ GET
    sent.length = 0;
    await fetchWith({ url: "http://example.com", bodyBase64: "AGFzbQ" });
    expect(sent).toEqual([
      {
        url: "http://example.com",
        method: "GET",
        headers: [],
        bodyBase64: null,
      },
    ]);

    sent.length = 0;
    expect(await fetchWith({ url: "file:///etc/passwd" })).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "only http and https urls can be fetched",
      },
    });
    expect(await fetchWith({ url: "not a url" })).toEqual({
      status: 400,
      body: { code: "invalid_argument", message: "invalid url 'not a url'" },
    });
    // アカウント ID は大文字小文字を区別する
    expect(
      await fetchWith(
        request,
        "Definy-Ed25519 feedbeef-cafe_babe.1800000000.AAAA",
      ),
    ).toEqual({
      status: 403,
      body: {
        code: "permission_denied",
        message: "HttpProxyService/Fetch is not allowed for this account",
      },
    });
    expect(await fetchWith(request, null)).toEqual({
      status: 401,
      body: {
        code: "unauthenticated",
        message: "HttpProxyService/Fetch requires an Authorization header",
      },
    });
    expect(await fetchWith(request, "Bearer x")).toEqual({
      status: 401,
      body: {
        code: "unauthenticated",
        message:
          "Authorization must be 'Definy-Ed25519 <account>.<time>.<sig>'",
      },
    });
    expect(sent).toEqual([]);
  });

  it("Authorization の署名は definy (definy.read-rpc-authorization) が確かめる", async () => {
    const admin = await generateAccountCredentials("admin");
    const other = await generateAccountCredentials("other");
    const path = "/definy.v1.HttpProxyService/Fetch";
    const body = { url: "file:///x" };
    const now = 1_800_000_000;
    /** 署名が正しければ url を検査して invalid_argument, 違えば unauthenticated (理由) */
    const fetchWith = async (
      authorization: string,
      nowSeconds = now,
      requestBody: unknown = body,
    ) =>
      (
        await handleRpcInDefiny(
          service,
          "HttpProxyService/Fetch",
          () => requestBody,
          host({
            verifyEd25519,
            now: () => nowSeconds * 1000 + 999,
            readAdminAccountIds: () => admin.accountId,
          }),
          [{ name: "Authorization", value: ` ${authorization} ` }],
        )
      ).body;
    const sign = (
      credentials = admin,
      method = "post",
      signedPath = path,
      signedBody: unknown = body,
      time = now,
    ) =>
      createRpcAuthorization(
        credentials,
        method,
        signedPath,
        JSON.stringify(signedBody),
        time,
      );
    const invalid = (message: string) => ({ code: "unauthenticated", message });

    expect(await fetchWith(await sign())).toEqual({
      code: "invalid_argument",
      message: "only http and https urls can be fetched",
    });
    expect(await fetchWith(await sign(other))).toEqual({
      code: "permission_denied",
      message: "HttpProxyService/Fetch is not allowed for this account",
    });
    // 時刻のずれは 300 秒まで
    expect(await fetchWith(await sign(), now + 300)).toMatchObject({
      code: "invalid_argument",
    });
    expect(await fetchWith(await sign(), now + 301)).toEqual(
      invalid("Authorization time is out of the allowed range"),
    );
    // 本文, パス, メソッドが違う / 別のアカウントの ID に差し替えた
    const failed = invalid("Authorization signature verification failed");
    expect(await fetchWith(await sign(), now, { url: "file:///y" })).toEqual(
      failed,
    );
    expect(await fetchWith(await sign(admin, "post", "/other"))).toEqual(
      failed,
    );
    expect(await fetchWith(await sign(admin, "get"))).toEqual(failed);
    expect(
      await fetchWith((await sign()).replace(admin.accountId, other.accountId)),
    ).toEqual(failed);
    const malformed = invalid(
      "Authorization must be 'Definy-Ed25519 <account>.<time>.<sig>'",
    );
    for (const header of [
      "Definy-Ed25519",
      "Definy-Ed25519 a.1",
      "Definy-Ed25519 a.1.b.c",
      "Definy-Ed25519 a.x1.b",
      "Definy-Ed25519 a..b",
      "Definy-Ed25519 a.1.b extra",
      "Other a.1.b",
    ]) {
      expect(await fetchWith(header)).toEqual(malformed);
    }
  });
});

describe("jsonToDefiny / definyToJson", () => {
  it("JSON の値を行き来できる", () => {
    const value = {
      a: [1, "x", true, null, { b: [] }],
      c: {},
    };
    expect(definyToJson(jsonToDefiny(value) as never)).toEqual(value);
  });

  it("整数でない数は扱えない", () => {
    expect(() => jsonToDefiny(1.5)).toThrow();
  });
});
