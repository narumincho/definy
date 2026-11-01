import { expect, it } from "vitest";
import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { bytesToBase64 } from "../src/cbor.ts";
import {
  createInvalidSignatureSamples,
  invalidSignatureSampleContents,
} from "../src/invalid_signature_samples.ts";
import type { Env, SeedBundle } from "./types.ts";
import { casItem, newSignedAccountEvent } from "./test_helpers.ts";

it("handleWorkerRequest loads seed bundle and serves EventService RPCs", async () => {
  const store = new WorkerStore();
  const sampleSeed: SeedBundle = {
    events: [
      {
        eventHash: "ev_hash_1",
        signedEventBytes: bytesToBase64(new Uint8Array([1, 2, 3])),
        accountId: "acc_1",
        eventType: "create_account",
        createdAtRfc3339: "2019-01-31T04:36:01Z",
        timeMs: 1000,
      },
      {
        eventHash: "ev_hash_2",
        signedEventBytes: bytesToBase64(new Uint8Array([4, 5, 6])),
        accountId: "acc_1",
        eventType: "module_commit",
        createdAtRfc3339: "2019-01-31T04:36:02Z",
        timeMs: 2000,
      },
    ],
    contents: [
      {
        contentHash: "hash_builtin_1",
        contentBytes: bytesToBase64(new Uint8Array([10, 20, 30])),
      },
    ],
  };

  const env: Env = {
    ASSETS: {
      fetch(input: Request | URL | string): Promise<Response> {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url.endsWith("/__definy_seed_bundle.json")) {
          return Promise.resolve(
            new Response(JSON.stringify(sampleSeed), { status: 200 }),
          );
        }
        return Promise.resolve(new Response("SPA index.html", { status: 200 }));
      },
    },
  };

  // 1. GetEvents returns seeded EventItems sorted by timeMs DESC
  const getEventsRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvents", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }),
    env,
    store,
  );
  expect(getEventsRes.status).toBe(200);
  const getEventsJson = await getEventsRes.json();
  expect(getEventsJson.events.length).toBe(2);
  expect(getEventsJson.events[0].eventHash).toBe("ev_hash_2");

  // 1b. GetEvent returns single event by eventHash
  const getEventRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvent", {
      method: "POST",
      body: JSON.stringify({ eventHash: "ev_hash_1" }),
    }),
    env,
    store,
  );
  expect(getEventRes.status).toBe(200);
  const getEventJson = await getEventRes.json();
  expect(getEventJson.event.eventHash).toBe("ev_hash_1");

  // 2. SubmitEvent rejects unsigned / tampered events
  const garbageRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/SubmitEvent",
      {
        method: "POST",
        body: JSON.stringify({
          signedEventBytes: bytesToBase64(new Uint8Array([7, 8, 9])),
        }),
      },
    ),
    env,
    store,
  );
  expect(garbageRes.status).toBe(400);

  const newEventB64 = await newSignedAccountEvent();
  const tampered = Uint8Array.fromBase64(newEventB64);
  tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 1;
  const tamperedRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/SubmitEvent",
      {
        method: "POST",
        body: JSON.stringify({ signedEventBytes: bytesToBase64(tampered) }),
      },
    ),
    env,
    store,
  );
  expect(tamperedRes.status).toBe(400);
  expect((await tamperedRes.json()).code).toBe("invalid_argument");

  // 2b. SubmitEvent accepts a correctly signed event and returns its URL-safe base64 EventHashId
  const submitRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/SubmitEvent",
      {
        method: "POST",
        body: JSON.stringify({ signedEventBytes: newEventB64 }),
      },
    ),
    env,
    store,
  );
  expect(submitRes.status).toBe(200);
  const submitJson = await submitRes.json();
  expect(typeof submitJson.eventHash).toBe("string");
  expect(submitJson.status).toBe("accepted");

  // 3. CheckMissingHashes & UploadContent & GetContent
  const wasmItem = await casItem(new Uint8Array([0x00, 0x61, 0x73, 0x6d]));
  const checkRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/CheckMissingHashes",
      {
        method: "POST",
        body: JSON.stringify({
          contentHashes: ["hash_builtin_1", wasmItem.contentHash],
        }),
      },
    ),
    env,
    store,
  );
  const checkJson = await checkRes.json();
  expect(checkJson.missingContentHashes.length).toBe(1);
  expect(checkJson.missingContentHashes[0]).toBe(wasmItem.contentHash);

  // ハッシュが中身と一致しないアップロードは拒否する
  const forgedRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/UploadContent",
      {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              contentHash: "hash_builtin_1",
              contentBytes: wasmItem.contentBytes,
            },
          ],
        }),
      },
    ),
    env,
    store,
  );
  expect(forgedRes.status).toBe(400);

  const uploadRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/UploadContent",
      {
        method: "POST",
        body: JSON.stringify({
          items: [wasmItem],
        }),
      },
    ),
    env,
    store,
  );
  const uploadJson = await uploadRes.json();
  expect(uploadJson.storedContentHashes.length).toBe(1);
  expect(uploadJson.storedContentHashes[0]).toBe(wasmItem.contentHash);

  const getContentRes = await handleWorkerRequest(
    new Request(
      "https://definy.workers.dev/definy.v1.EventService/GetContent",
      {
        method: "POST",
        body: JSON.stringify({ contentHash: wasmItem.contentHash }),
      },
    ),
    env,
    store,
  );
  const getContentJson = await getContentRes.json();
  expect(getContentJson.item.contentHash).toBe(wasmItem.contentHash);

  // 4. Virtual Wasm endpoint serves uploaded Wasm binary
  const wasmRes = await handleWorkerRequest(
    new Request(
      `https://definy.workers.dev/virtual/wasm/${wasmItem.contentHash}.wasm`,
    ),
    env,
    store,
  );
  expect(wasmRes.status).toBe(200);
  expect(wasmRes.headers.get("Content-Type")).toBe("application/wasm");
  expect(wasmRes.headers.get("Cache-Control")).toBe(
    "public, max-age=31536000, immutable",
  );
  const wasmBytes = new Uint8Array(await wasmRes.arrayBuffer());
  expect(wasmBytes.length).toBe(4);
  expect(wasmBytes[1]).toBe(0x61);
});

it("署名が不正なイベントは SubmitEvent で常に拒否し, 署名を確かめずに保存する経路は無い", async () => {
  const samples = await createInvalidSignatureSamples();
  const post = (path: string, signedEventBytes: string): Request =>
    new Request(`https://definy.workers.dev/definy.v1.${path}`, {
      method: "POST",
      body: JSON.stringify({ signedEventBytes }),
    });

  const store = new WorkerStore();
  store.loadSeedBundle({
    events: [],
    contents: [...invalidSignatureSampleContents()],
  });

  for (const sample of samples) {
    const res = await handleWorkerRequest(
      post("EventService/SubmitEvent", sample.signedEventBytes),
      {},
      store,
    );
    expect(res.status).toBe(400);
  }
  // 以前のデバッグ用エンドポイント (DebugService/SubmitUnverifiedEvent) も受け付けない
  const debugRes = await handleWorkerRequest(
    post("DebugService/SubmitUnverifiedEvent", samples[0]!.signedEventBytes),
    {},
    store,
  );
  expect(debugRes.ok).toBe(false);

  const eventsRes = await handleWorkerRequest(
    new Request("https://definy.workers.dev/definy.v1.EventService/GetEvents", {
      method: "POST",
      body: JSON.stringify({}),
    }),
    {},
    store,
  );
  const { events } = (await eventsRes.json()) as {
    readonly events: ReadonlyArray<unknown>;
  };
  expect(events).toEqual([]);
});
