/**
 * 増分型検査 (docs/incremental-type-check.md) の等価性を確かめるテスト。
 * 型に関わる変更が依存先まで伝わって、壊れた提出が拒否されることと、
 * 問題のない提出が受け付けられることを見る
 */
import { describe, expect, it } from "vitest";
import {
  generateAccountCredentials,
  type AccountCredentials,
} from "../src/auth.ts";
import type { DecodedPart } from "../src/decoded_event.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "../src/part_ids.ts";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { DefinyClient } from "../mcp/definy_client.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import type { Env } from "./types.ts";

const MODULE = "inctest";
const moduleId = deriveModuleIdBytes(MODULE);
const partId = (name: string): string => deriveModulePartId(moduleId, name);
const ref = (name: string): unknown => ({
  "#part_reference": { part_definition_event_hash: partId(name) },
});
const plusRef: unknown = {
  "#part_reference": {
    part_definition_event_hash: deriveModulePartId(
      deriveModuleIdBytes("core"),
      "plus",
    ),
  },
};

const partA = (partType: unknown, expression: unknown): DecodedPart => ({
  name: "a",
  description: [],
  partType,
  expression,
});
const partB = (right: number): DecodedPart => ({
  name: "b",
  description: [],
  partType: { "#type_number": null },
  expression: {
    "#call": {
      function: plusRef,
      arguments: [
        { name: "left", value: ref("a") },
        { name: "right", value: { "#number": right } },
      ],
    },
  },
});

describe("増分型検査の等価性", () => {
  it("型の変更が依存先に伝わり、壊れた提出は拒否される", async () => {
    const store = new WorkerStore();
    const db = createSqliteD1Database();
    await store.seedD1(db, await loadTestSeedBundle());
    const env: Env = { DB: db };
    const fetchFn = (async (input: string, init?: RequestInit) => {
      const path = String(input).replace(/^https:\/\/example\.test/, "");
      return handleWorkerRequest(
        new Request(`https://definy.local${path}`, init),
        env,
        store,
      );
    }) as typeof fetch;
    const client = new DefinyClient({
      baseUrl: "https://example.test",
      fetchFn,
    });
    const credentials: AccountCredentials =
      await generateAccountCredentials("inctest-owner");
    await client.submitAccountCreation(credentials);

    const submit = async (
      branch: string,
      parentCommitHash: string | null,
      parts: ReadonlyArray<DecodedPart>,
    ): Promise<{ eventHash: string; status: string }> => {
      try {
        const r = await client.submitCommit({
          credentials,
          projectName: "inctest",
          branch,
          projectDescription: [],
          message: "test",
          parentCommitHash,
          modules: [{ name: MODULE, description: [], parts }],
        });
        console.log(`submit ${branch}:`, r.status);
        return r;
      } catch (e) {
        console.log(`submit ${branch}: THREW`, String(e).slice(0, 160));
        return { eventHash: "", status: `threw: ${String(e).slice(0, 120)}` };
      }
    };

    // v1: a = 1 (number), b = a + 1
    const v1 = await submit("main", null, [
      partA({ "#type_number": null }, { "#number": 1 }),
      partB(1),
    ]);
    expect(v1.status).toBe("accepted");

    // 本体だけの変更 (b = a + 2) は受け付けられる
    const bodyOnly = await submit("body", v1.eventHash, [
      partA({ "#type_number": null }, { "#number": 1 }),
      partB(2),
    ]);
    expect(bodyOnly.status).toBe("accepted");

    // a の型を boolean に変えると、b (a + 1) が型エラーになるので拒否される
    const breaking = await submit("break", v1.eventHash, [
      partA({ "#type_boolean": null }, { "#boolean": true }),
      partB(1),
    ]);
    expect(breaking.status).not.toBe("accepted");

    // a を消すと、b の参照先が無くなるので拒否される
    const deleted = await submit("delete", v1.eventHash, [partB(1)]);
    expect(deleted.status).not.toBe("accepted");

    // 型パーツ t の宣言を変えると、それを使う p が型エラーになるので拒否される
    const typePart: DecodedPart = {
      name: "t",
      description: [],
      partType: { "#type_type": null },
      expression: { "#type_number": null },
    };
    const usesType: DecodedPart = {
      name: "p",
      description: [],
      partType: ref("t"),
      expression: { "#number": 5 },
    };
    const v1t = await submit("typepart", v1.eventHash, [typePart, usesType]);
    expect(v1t.status).toBe("accepted");
    const breakingType = await submit("typepart2", v1t.eventHash, [
      { ...typePart, expression: { "#type_boolean": null } },
      usesType,
    ]);
    expect(breakingType.status).not.toBe("accepted");
  }, 600_000);
});
