import { expect, it } from "vitest";
import {
  createSignedAccountEvent,
  generateAccountCredentials,
  submitProjectCommitEvent,
  submitSignedEvent,
} from "../src/auth.ts";
import { extractProjectCommit, type DecodedPart } from "../src/cbor.ts";
import {
  cachedContent,
  loadContents,
  missingContentHashes,
  partContentItem,
  withCachedContents,
} from "../src/content_store.ts";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { createSqliteD1Database } from "./test_helpers.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import { createSignedSingleModuleCommitEvent } from "../src/test_commit.ts";

/** docs/content-addressed.md「差分ハッシュ・ネゴシエーション方式」 */
it("コミットにはパーツの中身の content hash だけを入れ, サーバーに無い中身だけを送る", async () => {
  const store = new WorkerStore();
  const db = createSqliteD1Database();
  await store.seedD1(db, await loadTestSeedBundle());
  const env = { DB: db };
  const calls: string[] = [];
  const fetchFn = (async (input: string, init?: RequestInit) => {
    calls.push(input.replace("/definy.v1.EventService/", ""));
    return handleWorkerRequest(
      new Request(`https://definy.local${input}`, init),
      env,
      store,
    );
  }) as typeof fetch;

  const credentials = await generateAccountCredentials("alice");
  expect(
    (
      await submitSignedEvent(
        (await createSignedAccountEvent(credentials)).signedEventBytes,
        fetchFn,
      )
    ).status,
  ).toBe("accepted");

  const commit = async (
    parts: ReadonlyArray<DecodedPart>,
    parentCommitHash: string | null,
  ) => {
    const signed = await createSignedSingleModuleCommitEvent({
      credentials,
      moduleName: "app",
      moduleDescription: [],
      message: "test",
      parentCommitHash,
      parts,
    });
    calls.length = 0;
    const result = await submitProjectCommitEvent(
      signed.signedEventBytes,
      signed.contents,
      fetchFn,
    );
    return { result, signed };
  };
  const answer = (value: number): DecodedPart => ({
    name: "answer",
    description: [],
    partType: { "#type_number": null },
    expression: { "#number": value },
  });

  // 新しい中身は 1 度目の提出で足りないと言われ, 送ってから出し直す
  const first = await commit([answer(42)], null);
  expect(first.result.status).toBe("accepted");
  expect(calls).toEqual(["SubmitEvent", "UploadContent", "SubmitEvent"]);
  const committed = extractProjectCommit(first.signed.signedEventBytes)
    ?.modules[0];
  expect(committed?.parts[0]?.unresolved).toBe(true);
  const hash = committed?.parts[0]?.contentHash ?? "";
  expect(hash).not.toBe("");

  // サーバーにある中身は送らない
  const second = await commit([answer(42)], first.signed.eventHash);
  expect(second.result.status).toBe("accepted");
  expect(calls).toEqual(["SubmitEvent"]);

  // 読む側は content hash から中身を読む
  const stored = partContentItem({
    description: [{ language: "en", text: "stored" }],
    visibility: "public",
    partType: { "#type_number": null },
    expression: { "#number": 7 },
  });
  await fetchFn("/definy.v1.EventService/UploadContent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [stored] }),
  });
  const unresolved: DecodedPart = {
    name: "stored",
    description: [],
    partType: null,
    contentHash: stored.contentHash,
    unresolved: true,
  };
  expect(missingContentHashes([unresolved])).toEqual([stored.contentHash]);
  await loadContents([stored.contentHash], async (method, body) => {
    const res = await fetchFn(`/definy.v1.EventService/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  });
  expect(cachedContent(stored.contentHash)).toEqual({
    description: [{ language: "en", text: "stored" }],
    visibility: "public",
    partType: { "#type_number": null },
    expression: { "#number": 7 },
  });
  expect(missingContentHashes([unresolved])).toEqual([]);
  expect(withCachedContents([unresolved])[0]).toMatchObject({
    description: [{ language: "en", text: "stored" }],
    expression: { "#number": 7 },
  });
});

it("中身の SHA-256 が content hash と一致しないものは使わない", async () => {
  const loaded = await loadContents(["fake-hash"], () =>
    Promise.resolve({
      items: [{ contentHash: "fake-hash", contentBytes: "AQID" }],
    }),
  );
  expect(loaded).toBe(false);
  expect(cachedContent("fake-hash")).toBeUndefined();
});

it("CAS に預けた定義の式を評価した中身が core.part-content の形でなければ受け付けない", async () => {
  const store = new WorkerStore();
  const db = createSqliteD1Database();
  await store.seedD1(db, await loadTestSeedBundle());
  const env = { DB: db };
  const fetchFn = (async (input: string, init?: RequestInit) =>
    handleWorkerRequest(
      new Request(`https://definy.local${input}`, init),
      env,
      store,
    )) as typeof fetch;
  const credentials = await generateAccountCredentials("mallory");
  await submitSignedEvent(
    (await createSignedAccountEvent(credentials)).signedEventBytes,
    fetchFn,
  );
  // 式が core.expression の形でない中身を, 正しい中身の content hash として送る
  const signed = await createSignedSingleModuleCommitEvent({
    credentials,
    moduleName: "bad",
    moduleDescription: [],
    message: "test",
    parentCommitHash: null,
    parts: [
      {
        name: "bad",
        description: [],
        partType: { "#type_number": null },
        expression: { "#not_an_expression": 1 },
      },
    ],
  });
  await expect(
    submitProjectCommitEvent(signed.signedEventBytes, signed.contents, fetchFn),
  ).rejects.toThrow(
    "is not a part definition that evaluates to a core.part-content",
  );
});
