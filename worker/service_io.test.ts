import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { CommitSummary } from "../src/event_check.ts";
import { none, some, variant } from "../src/definy_value.ts";
import {
  type CommitModule,
  type CommitPart,
  type EventContent,
  type PartContent,
} from "../src/event_content.ts";
import {
  definyToJson,
  handleRpcInDefiny,
  jsonToDefiny,
  type ServiceIoHost,
} from "./service_io.ts";
import { partDefinitionExpression } from "../src/part_definition.ts";
import type { EventItem } from "./types.ts";

const service = new WebAssembly.Module(await readFile("wasm/service.wasm"));

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
  readonly environment?: ReadonlyArray<unknown>;
}): unknown => ({
  project_name: "app",
  parts: input.parts,
  environment: input.environment ?? [],
  latest: [],
  project_module_ids: [],
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

/** 読まないはずのホスト. `overrides` で読むものだけ与える */
const host = (overrides: Partial<ServiceIoHost> = {}): ServiceIoHost => ({
  readCommits: () => Promise.reject(new Error("not read")),
  readEvents: () => Promise.reject(new Error("not read")),
  readEventsPage: () => Promise.reject(new Error("not read")),
  readContents: () => Promise.reject(new Error("not read")),
  readMissingContentHashes: () => Promise.reject(new Error("not read")),
  readAccountCreated: () => Promise.reject(new Error("not read")),
  verifySignedEvent: () => Promise.reject(new Error("not verified")),
  readCommitCheckInput: () => Promise.reject(new Error("not read")),
  readPartDefinitions: () => Promise.reject(new Error("not read")),
  writeEvent: () => Promise.reject(new Error("not written")),
  hashContents: () => Promise.reject(new Error("not hashed")),
  writeContents: () => Promise.reject(new Error("not written")),
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
        "GetProjectBranches",
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

  it("definy で処理しないメソッドは null で, 本文を読まない", async () => {
    expect(
      await handleRpcInDefiny(
        service,
        "Unknown",
        () => {
          throw new Error("not read");
        },
        host(),
      ),
    ).toBeNull();
  });

  it("SubmitEvent は署名を確かめ, 規則・足りない中身・型チェッカーの順に見てから保存する", async () => {
    const steps: Array<string> = [];
    const createAccount: EventContent = {
      type: "create_account",
      accountName: "alice",
    };
    const submitHost = (
      overrides: Partial<ServiceIoHost> = {},
      content: EventContent = createAccount,
    ): ServiceIoHost =>
      host({
        verifySignedEvent: (bytes) => {
          steps.push(`verify ${bytes}`);
          return Promise.resolve(
            bytes === "bad"
              ? { invalid: "Ed25519 signature verification failed" }
              : {
                  eventHash: "e1",
                  accountId: "alice",
                  content,
                  referencedContentHashes: ["c1", "c2"],
                },
          );
        },
        readAccountCreated: (accountId) => {
          steps.push(`account ${accountId}`);
          return Promise.resolve(false);
        },
        readCommits: () => {
          steps.push("commits");
          return Promise.resolve([commit("m1", "alice", "main", 100)]);
        },
        readMissingContentHashes: (hashes) => {
          steps.push(`missing ${hashes.join(",")}`);
          return Promise.resolve([]);
        },
        readCommitCheckInput: () => {
          steps.push("type check");
          return Promise.resolve(null);
        },
        writeEvent: (bytes) => {
          steps.push(`write ${bytes}`);
          return Promise.resolve("e1");
        },
        ...overrides,
      });
    const submit = (request: unknown, h: ServiceIoHost) =>
      handleRpcInDefiny(service, "SubmitEvent", () => request, h);

    expect(await submit({ signedEventBytes: " ok\n" }, submitHost())).toEqual({
      status: 200,
      body: { eventHash: "e1", status: "accepted", missingContentHashes: [] },
    });
    expect(steps).toEqual([
      "verify ok",
      "account alice",
      "missing c1,c2",
      "type check",
      "write ok",
    ]);

    steps.length = 0;
    expect(
      await submit(
        { signedEventBytes: "ok" },
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
    expect(steps).toEqual(["verify ok", "account alice"]);

    expect(
      await submit(
        { signedEventBytes: "ok" },
        submitHost({ readAccountCreated: () => Promise.resolve(true) }),
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
        { signedEventBytes: "ok" },
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
    expect(await submit({ signedEventBytes: "bad" }, submitHost())).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "Ed25519 signature verification failed",
      },
    });
    expect(await submit({ signedEventBytes: " " }, host())).toEqual({
      status: 400,
      body: {
        code: "invalid_argument",
        message: "signedEventBytes is required",
      },
    });
  });

  it("SubmitEvent はプロジェクトのコミットなら受け付けたコミットも読んで規則 (core.check-event) で検査する", async () => {
    const part = (name: string): CommitPart => ({
      name,
      description: [],
      partType: null,
      expression: null,
      contentHash: "",
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
        "SubmitEvent",
        () => ({ signedEventBytes: "ok" }),
        host({
          verifySignedEvent: () =>
            Promise.resolve({
              eventHash: "e2",
              accountId: "alice",
              content,
              referencedContentHashes: [],
            }),
          readAccountCreated: () => Promise.resolve(true),
          readCommits: () => {
            reads.push("commits");
            return Promise.resolve([commit("m1", "alice", "main", 100)]);
          },
          readMissingContentHashes: () => Promise.resolve([]),
          readCommitCheckInput: () => Promise.resolve(null),
          writeEvent: () => Promise.resolve("e2"),
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
    expect(reads).toEqual(["commits"]);

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
        "SubmitEvent",
        () => ({ signedEventBytes: "ok" }),
        host({
          verifySignedEvent: () =>
            Promise.resolve({
              eventHash: "e3",
              accountId: "alice",
              content: { type: "create_account", accountName: "alice" },
              referencedContentHashes: [],
            }),
          readAccountCreated: () => Promise.resolve(false),
          readMissingContentHashes: () => Promise.resolve([]),
          readCommitCheckInput: () => Promise.resolve(input),
          writeEvent: () => Promise.resolve("e3"),
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
          environment: [
            {
              id: "id-secret",
              name: "lib.secret",
              module_name: "lib",
              project_name: "lib",
              visibility: variant("private"),
              module_visibility: variant("public"),
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
        "SubmitEvent",
        () => ({ signedEventBytes: "ok" }),
        host({
          verifySignedEvent: () =>
            Promise.resolve({
              eventHash: "e4",
              accountId: "alice",
              content: { type: "create_account", accountName: "alice" },
              referencedContentHashes: [],
            }),
          readAccountCreated: () => Promise.resolve(false),
          readMissingContentHashes: () => Promise.resolve([]),
          readCommitCheckInput: () => Promise.resolve(checkInput({ parts })),
          writeEvent: () => Promise.resolve("e4"),
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
      handleRpcInDefiny(service, "UploadContent", () => request, uploadHost);
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
        "GetEvent",
        () => ({ eventHash: " e1\n" }),
        eventHost,
      ),
    ).toEqual({ status: 200, body: { event: event("e1", 5) } });
    expect(
      await handleRpcInDefiny(
        service,
        "GetEvent",
        () => ({ eventHash: "e2" }),
        eventHost,
      ),
    ).toEqual({
      status: 404,
      body: { code: "not_found", message: "Event 'e2' not found" },
    });
    expect(
      await handleRpcInDefiny(service, "GetEvent", () => ({}), host()),
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
        await handleRpcInDefiny(service, "GetEvents", () => request, pageHost),
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
        "GetContent",
        () => ({ contentHash: "c1" }),
        contentHost,
      ),
    ).toEqual({ status: 200, body: { item } });
    expect(
      await handleRpcInDefiny(
        service,
        "GetContent",
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
        "GetContent",
        () => ({ contentHashes: ["c2", "c1"] }),
        contentHost,
      ),
    ).toEqual({ status: 200, body: { items: [item] } });
    expect(
      await handleRpcInDefiny(service, "GetContent", () => ({}), host()),
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
        "CheckMissingHashes",
        () => ({ contentHashes: ["a", "b"] }),
        host({
          readMissingContentHashes: (hashes) =>
            Promise.resolve(hashes.filter((hash) => hash === "b")),
        }),
      ),
    ).toEqual({ status: 200, body: { missingContentHashes: ["b"] } });
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
