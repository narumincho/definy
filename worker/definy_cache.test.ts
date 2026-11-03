import { describe, expect, it } from "vitest";
import {
  createCommitCacheHost,
  createDefinitionCacheHost,
} from "./commit_store.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import type { CommitCacheEntry, DefinitionCacheEntry } from "./service_io.ts";

const definitionEntry = (hash: string): DefinitionCacheEntry => ({
  content_hash: hash,
  definition: {
    "#call": {
      function: {
        "#part_reference": { part_definition_event_hash: "somePart" },
      },
      arguments: [
        { name: "description", value: { "#list": [] } },
        { name: "expression", value: { "#some": { "#number": 42 } } },
      ],
    },
  },
});

const commitEntry = (hash: string): CommitCacheEntry => ({
  event_hash: hash,
  commit: {
    account_id: "account",
    project_name: "sample",
    branch: "main",
    time: 1762000000000,
    modules: [{ name: "sample", id: "mod", parts: [] }],
  },
});

describe("永続キャッシュ (D1 に保存するホストのキャッシュ)", () => {
  it("定義のキャッシュは別のメモリ (別の isolate) からも D1 経由で読める", async () => {
    const db = createSqliteD1Database();
    const writer = createDefinitionCacheHost(db, new Map());
    await writer.writeCachedDefinitions([
      definitionEntry("hash-a"),
      definitionEntry("hash-b"),
    ]);

    const reader = createDefinitionCacheHost(db, new Map());
    const read = await reader.readCachedDefinitions([
      "hash-a",
      "hash-b",
      "hash-c",
    ]);
    expect(read).toEqual([
      definitionEntry("hash-a"),
      definitionEntry("hash-b"),
    ]);
  });

  it("コミットのキャッシュも D1 をまたいで読める (commit が null のものも)", async () => {
    const db = createSqliteD1Database();
    const writer = createCommitCacheHost(db, new Map());
    const noneEntry: CommitCacheEntry = { event_hash: "ev-none", commit: null };
    await writer.writeCachedCommits([commitEntry("ev-1"), noneEntry]);

    const reader = createCommitCacheHost(db, new Map());
    const read = await reader.readCachedCommits(["ev-1", "ev-none", "ev-x"]);
    expect(read).toEqual([commitEntry("ev-1"), noneEntry]);
  });

  it("D1 が無ければメモリだけ (別のメモリからは読めない)", async () => {
    const writer = createDefinitionCacheHost(undefined, new Map());
    await writer.writeCachedDefinitions([definitionEntry("hash-a")]);
    expect(await writer.readCachedDefinitions(["hash-a"])).toEqual([
      definitionEntry("hash-a"),
    ]);
    const other = createDefinitionCacheHost(undefined, new Map());
    expect(await other.readCachedDefinitions(["hash-a"])).toEqual([]);
  });

  it("D1 への保存に失敗してもメモリで動き続ける", async () => {
    const brokenDb = {
      prepare: () => {
        throw new Error("no db");
      },
      batch: () => Promise.reject(new Error("no db")),
      exec: () => Promise.reject(new Error("no db")),
    } as never;
    const host = createDefinitionCacheHost(brokenDb, new Map());
    await host.writeCachedDefinitions([definitionEntry("hash-a")]);
    expect(await host.readCachedDefinitions(["hash-a"])).toEqual([
      definitionEntry("hash-a"),
    ]);
  });
});
