import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { CommitSummary } from "../src/event_check.ts";
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
        "SubmitEvent",
        () => {
          throw new Error("not read");
        },
        host(),
      ),
    ).toBeNull();
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
