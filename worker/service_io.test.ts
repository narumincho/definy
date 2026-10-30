import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { CommitSummary } from "../src/event_check.ts";
import type {
  CommitModule,
  CommitPart,
  EventContent,
} from "../src/event_content.ts";
import {
  definyToJson,
  handleRpcInDefiny,
  jsonToDefiny,
  type ServiceIoHost,
} from "./service_io.ts";
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
  typeCheckCommit: () => Promise.reject(new Error("not checked")),
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
        typeCheckCommit: () => {
          steps.push("type check");
          return Promise.resolve([]);
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
          typeCheckCommit: () => Promise.resolve(["app.x: type_mismatch"]),
        }),
      ),
    ).toEqual({
      status: 400,
      body: { code: "invalid_argument", message: "app.x: type_mismatch" },
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
          typeCheckCommit: () => Promise.resolve([]),
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
