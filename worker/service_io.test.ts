import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { CommitSummary } from "../src/event_check.ts";
import { none, some, variant } from "../src/definy_value.ts";
import { bytesToBase64, bytesToUrlSafeBase64NoPad } from "../src/base64.ts";
import { encodeCborItem } from "../src/cbor.ts";
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
  type ServiceIoHost,
} from "./service_io.ts";
import { partDefinitionExpression } from "../src/part_definition.ts";
import type { EventItem } from "./types.ts";

const service = new WebAssembly.Module(await readFile("wasm/service.wasm"));

/** RPC `/definy.v1.<method>` を本文 `request` で `definy.handle-request` に処理させ, JSON のレスポンスを返す */
async function handleRpcInDefiny(
  module: WebAssembly.Module,
  method: string,
  request: () => unknown,
  rpcHost: ServiceIoHost,
): Promise<{ readonly status: number; readonly body: unknown }> {
  const result = await handleRequestInDefiny(
    module,
    {
      method: "POST",
      path: `/definy.v1.${method}`,
      headers: [],
      storage: "in-memory",
      hasAssets: false,
    },
    {
      ...rpcHost,
      ensureSeeded: () => Promise.resolve(),
      readRequestJson: () => Promise.resolve({ json: request() }),
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

/** `definy.commit-check-part` (中身が `null` なら core.part-content に評価できなかったもの) */
const checkPart = (
  name: string,
  content: PartContent | null,
  contentHash = `hash-${name}`,
): unknown => ({
  id: `id-${name}`,
  name: `app.${name}`,
  module_name: "app",
  module_id: "module-app",
  module_visibility: variant("public"),
  content_hash: contentHash,
  definition:
    content === null ? none() : some(partDefinitionExpression(content)),
});

/** `definy.commit-check-source` */
const checkInput = (input: {
  readonly parts: ReadonlyArray<unknown>;
  /** 型環境にする各プロジェクトの main の最新のコミット (`definy.latest-commit-source`) */
  readonly latestCommits?: ReadonlyArray<unknown>;
}): unknown => ({
  project_name: "app",
  parts: input.parts,
  latest_commits: input.latestCommits ?? [],
  project_module_ids: [],
});

/** プロジェクト `lib` の main の最新のコミットのパーツ (`definy.commit-check-source-part`) */
const libPart = (name: string, content: PartContent): unknown => ({
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

const event = (eventHash: string, timeMs?: number): EventItem => ({
  eventHash,
  signedEventBytes: `signed-${eventHash}`,
  accountId: "alice",
  eventType: "project_commit",
  createdAtRfc3339: "2026-10-27T00:00:00Z",
  ...(timeMs === undefined ? {} : { timeMs }),
});

/** `accountIds` の `create_account` を受け付けたストアの `read_events_page` */
const createdAccounts =
  (accountIds: ReadonlyArray<string>): ServiceIoHost["readEventsPage"] =>
  (page) =>
    Promise.resolve(
      page.eventType === "create_account"
        ? accountIds
            .slice(page.offset, page.offset + page.limit)
            .map((accountId, i) => ({
              ...event(`account-${page.offset + i}`),
              accountId,
              eventType: "create_account",
            }))
        : [],
    );

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
  readCommits: () => Promise.reject(new Error("not read")),
  readEvents: () => Promise.reject(new Error("not read")),
  readEventsPage: () => Promise.reject(new Error("not read")),
  readContents: () => Promise.reject(new Error("not read")),
  readMissingContentHashes: () => Promise.reject(new Error("not read")),
  verifyEd25519: () => Promise.reject(new Error("not verified")),
  now: () => {
    throw new Error("not read");
  },
  readCommitCheckInput: () => Promise.reject(new Error("not read")),
  readPartDefinitions: () => Promise.reject(new Error("not read")),
  writeEvent: () => Promise.reject(new Error("not written")),
  hashContents: () => Promise.reject(new Error("not hashed")),
  writeContents: () => Promise.reject(new Error("not written")),
  readAuthorization: () => Promise.reject(new Error("not read")),
  readAdminAccountIds: () => {
    throw new Error("not read");
  },
  httpFetch: () => Promise.reject(new Error("not fetched")),
  ensureSeeded: () => Promise.reject(new Error("not seeded")),
  readRequestJson: () => Promise.reject(new Error("not read")),
  readRawContent: () => Promise.reject(new Error("not read")),
  ...overrides,
});

describe("handleRpcInDefiny", () => {
  it("GetProjectBranches はブランチと最新のイベントを返す. 見つからないイベントのブランチは除く", async () => {
    const reads: Array<ReadonlyArray<string>> = [];
    const branchesHost = host({
      readCommits: () =>
        Promise.resolve([
          commit("m1", "alice", "main", 100),
          commit("b1", "bob", "bob", 200),
          commit("m2", "alice", "main", 300),
          commit("g1", "carol", "gone", 400),
        ]),
      readEvents: (hashes) => {
        reads.push(hashes);
        return Promise.resolve(
          hashes.map((hash) =>
            hash === "m2"
              ? event(hash, 300)
              : hash === "b1"
                ? event(hash)
                : undefined,
          ),
        );
      },
    });
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
            latestEvent: event("b1"),
          },
        ],
      },
    });
    expect(reads).toEqual([["m2", "b1", "g1"]]);
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
    const submitHost = (
      overrides: Partial<ServiceIoHost> = {},
    ): ServiceIoHost =>
      host({
        ...verifyingHost("e1"),
        verifyEd25519: (publicKey, _signature, message) => {
          steps.push(`verify ${publicKey.length} ${message.length}`);
          return Promise.resolve(true);
        },
        readEventsPage: (page) => {
          steps.push(`events ${page.eventType} ${page.offset}`);
          return createdAccounts([])(page);
        },
        readCommits: () => {
          steps.push("commits");
          return Promise.resolve([commit("m1", alice, "main", 100)]);
        },
        readMissingContentHashes: (hashes) => {
          steps.push(`missing ${hashes.join(",")}`);
          return Promise.resolve([]);
        },
        readCommitCheckInput: () => {
          steps.push("type check");
          return Promise.resolve(null);
        },
        writeEvent: (event) => {
          steps.push(
            `write ${event.signedEventBytes === signed} ${event.eventHash} ${event.accountId === alice} ${event.eventType} ${event.timeMs}`,
          );
          return Promise.resolve();
        },
        ...overrides,
      });
    const submit = (request: unknown, h: ServiceIoHost) =>
      handleRpcInDefiny(service, "EventService/SubmitEvent", () => request, h);

    expect(
      await submit({ signedEventBytes: ` ${signed}\n` }, submitHost()),
    ).toEqual({
      status: 200,
      body: { eventHash: "e1", status: "accepted", missingContentHashes: [] },
    });
    const innerLength = signedEventInnerLength(createAccount);
    expect(steps).toEqual([
      `verify 32 ${innerLength}`,
      "events create_account 0",
      "missing ",
      "type check",
      "write true e1 true create_account 1000000",
    ]);

    steps.length = 0;
    expect(
      await submit(
        { signedEventBytes: signed },
        submitHost({ readMissingContentHashes: () => Promise.resolve(["c2"]) }),
      ),
    ).toEqual({
      status: 200,
      body: {
        eventHash: "e1",
        status: "missing_content",
        missingContentHashes: ["c2"],
      },
    });
    expect(steps).toEqual([
      `verify 32 ${innerLength}`,
      "events create_account 0",
    ]);

    expect(
      await submit(
        { signedEventBytes: signed },
        submitHost({ readEventsPage: createdAccounts([alice]) }),
      ),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "the account has already been created",
      },
    });
    expect(
      await submit(
        { signedEventBytes: signed },
        submitHost({
          readCommitCheckInput: () =>
            Promise.resolve(
              checkInput({ parts: [checkPart("x", null, "c1")] }),
            ),
        }),
      ),
    ).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message:
          "app.x: the content c1 is not a part definition that evaluates to a core.part-content",
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
    const reads: Array<string> = [];
    const submitCommit = (content: EventContent) =>
      handleRpcInDefiny(
        service,
        "EventService/SubmitEvent",
        () => ({ signedEventBytes: signedEvent(content) }),
        host({
          ...verifyingHost("e2"),
          readEventsPage: createdAccounts([alice]),
          readCommits: () => {
            reads.push("commits");
            return Promise.resolve([commit("m1", alice, "main", 100)]);
          },
          readMissingContentHashes: (hashes) => {
            reads.push(`missing ${hashes.join(",")}`);
            return Promise.resolve([]);
          },
          readCommitCheckInput: () => Promise.resolve(null),
          writeEvent: () => Promise.resolve(),
        }),
      );

    expect(
      await submitCommit(
        projectCommit({
          parent: "m1",
          modules: [{ name: "app", description: [], parts: [part("x")] }],
        }),
      ),
    ).toEqual({
      status: 200,
      body: { eventHash: "e2", status: "accepted", missingContentHashes: [] },
    });
    expect(reads).toEqual(["commits", "missing hash-x"]);

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
    const submitWith = (input: unknown) =>
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
          ...verifyingHost("e3"),
          readEventsPage: createdAccounts([]),
          readMissingContentHashes: () => Promise.resolve([]),
          readCommitCheckInput: () => Promise.resolve(input),
          writeEvent: () => Promise.resolve(),
        }),
      );
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
    const submitWith = (parts: ReadonlyArray<unknown>) =>
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
          ...verifyingHost("e4"),
          readEventsPage: createdAccounts([]),
          readMissingContentHashes: () => Promise.resolve([]),
          readCommitCheckInput: () => Promise.resolve(checkInput({ parts })),
          writeEvent: () => Promise.resolve(),
        }),
      );
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
          ...(checkPart("y", null) as object),
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
          ...(checkPart("z", null) as object),
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
    const offsets: Array<number> = [];
    const submitCreateAccount = (accountIds: ReadonlyArray<string>) =>
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
          readEventsPage: (page) => {
            offsets.push(page.offset);
            return createdAccounts(accountIds)(page);
          },
          readMissingContentHashes: () => Promise.resolve([]),
          readCommitCheckInput: () => Promise.resolve(null),
          writeEvent: () => Promise.resolve(),
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
    expect(offsets).toEqual([0, 500]);

    offsets.length = 0;
    expect(await submitCreateAccount(others)).toEqual({
      status: 200,
      body: { eventHash: "e5", status: "accepted", missingContentHashes: [] },
    });
    expect(offsets).toEqual([0, 500]);
  });

  it("UploadContent は SHA-256 が content hash と一致するときだけ保存する", async () => {
    const written: Array<unknown> = [];
    const uploadHost = host({
      hashContents: (contents) =>
        Promise.resolve(
          contents.map((bytes) =>
            bytes === "not base64" ? undefined : `hash-of-${bytes}`,
          ),
        ),
      writeContents: (items) => {
        written.push(items);
        return Promise.resolve(items.map((item) => item.contentHash));
      },
    });
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
    expect(written).toEqual([
      [
        { contentHash: "hash-of-a", contentBytes: "a" },
        { contentHash: "hash-of-b", contentBytes: "b" },
      ],
    ]);
    expect(await upload({})).toEqual({
      status: 200,
      body: { storedContentHashes: [] },
    });

    written.length = 0;
    expect(
      await upload({ items: [item("hash-of-a", "a"), item("x", "b")] }),
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
    expect(written).toEqual([]);
  });

  it("GetEvent は両端の空白を除いたハッシュのイベントを返し, 無ければ not_found, 空なら invalid_argument", async () => {
    const eventHost = host({
      readEvents: (hashes) =>
        Promise.resolve(
          hashes.map((hash) => (hash === "e1" ? event(hash, 5) : undefined)),
        ),
    });
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
    const pages: Array<unknown> = [];
    const pageHost = host({
      readEventsPage: (page) => {
        pages.push(page);
        return Promise.resolve([event("e1")]);
      },
    });
    for (const request of [
      {},
      { eventType: "", limit: 1000, offset: -3 },
      { eventType: "project_commit", limit: 0, offset: 7 },
    ]) {
      expect(
        await handleRpcInDefiny(
          service,
          "EventService/GetEvents",
          () => request,
          pageHost,
        ),
      ).toEqual({ status: 200, body: { events: [event("e1")] } });
    }
    expect(pages).toEqual([
      { eventType: null, limit: 50, offset: 0 },
      { eventType: null, limit: 500, offset: 0 },
      { eventType: "project_commit", limit: 1, offset: 7 },
    ]);
  });

  it("GetContent は contentHash の中身か, contentHashes のうち見つかった中身を返す", async () => {
    const contentHost = host({
      readContents: (hashes) =>
        Promise.resolve(
          hashes.map((hash) =>
            hash === "c1"
              ? { contentHash: hash, contentBytes: "AAEC" }
              : undefined,
          ),
        ),
    });
    const item = { contentHash: "c1", contentBytes: "AAEC" };
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
        () => ({ contentHashes: ["a", "b"] }),
        host({
          readMissingContentHashes: (hashes) =>
            Promise.resolve(hashes.filter((hash) => hash === "b")),
        }),
      ),
    ).toEqual({ status: 200, body: { missingContentHashes: ["b"] } });
  });

  it("HttpProxyService/Fetch は管理者の署名があるときだけ, 送らないヘッダーを除いて送る", async () => {
    const sent: Array<unknown> = [];
    const proxyHost = (
      authorization: Awaited<ReturnType<ServiceIoHost["readAuthorization"]>>,
    ) =>
      host({
        readAuthorization: () => Promise.resolve(authorization),
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
      authorization: Awaited<ReturnType<ServiceIoHost["readAuthorization"]>> = {
        type: "account",
        accountId: "FEEDBEEF-cafe_babe",
      },
    ) =>
      handleRpcInDefiny(
        service,
        "HttpProxyService/Fetch",
        () => request,
        proxyHost(authorization),
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
      await fetchWith(request, {
        type: "account",
        accountId: "feedbeef-cafe_babe",
      }),
    ).toEqual({
      status: 403,
      body: {
        code: "permission_denied",
        message: "HttpProxyService/Fetch is not allowed for this account",
      },
    });
    expect(await fetchWith(request, { type: "anonymous" })).toEqual({
      status: 401,
      body: {
        code: "unauthenticated",
        message: "HttpProxyService/Fetch requires an Authorization header",
      },
    });
    expect(
      await fetchWith(request, { type: "invalid", message: "bad signature" }),
    ).toEqual({
      status: 401,
      body: { code: "unauthenticated", message: "bad signature" },
    });
    expect(sent).toEqual([]);
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
