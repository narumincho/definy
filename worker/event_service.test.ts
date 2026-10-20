import { handleWorkerRequest, WorkerStore } from "./index.ts";
import { bytesToBase64 } from "./store.ts";
import { createInvalidSignatureSamples } from "../src/invalid_signature_samples.ts";
import {
  type UnverifiedEventRecord,
  verifyEventRecord,
} from "../src/signed_event.ts";
import type { Env, SeedBundle } from "./types.ts";
import {
  assertEquals,
  casItem,
  Deno,
  newSignedAccountEvent,
} from "./test_helpers.ts";

Deno.test(
  "handleWorkerRequest loads seed bundle and serves EventService RPCs",
  async () => {
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
          return Promise.resolve(
            new Response("SPA index.html", { status: 200 }),
          );
        },
      },
    };

    // 1. GetEvents returns seeded EventItems sorted by timeMs DESC
    const getEventsRes = await handleWorkerRequest(
      new Request(
        "https://definy.workers.dev/definy.v1.EventService/GetEvents",
        {
          method: "POST",
          body: JSON.stringify({ limit: 10 }),
        },
      ),
      env,
      store,
    );
    assertEquals(getEventsRes.status, 200);
    const getEventsJson = await getEventsRes.json();
    assertEquals(getEventsJson.events.length, 2);
    assertEquals(getEventsJson.events[0].eventHash, "ev_hash_2");

    // 1b. GetEvent returns single event by eventHash
    const getEventRes = await handleWorkerRequest(
      new Request(
        "https://definy.workers.dev/definy.v1.EventService/GetEvent",
        {
          method: "POST",
          body: JSON.stringify({ eventHash: "ev_hash_1" }),
        },
      ),
      env,
      store,
    );
    assertEquals(getEventRes.status, 200);
    const getEventJson = await getEventRes.json();
    assertEquals(getEventJson.event.eventHash, "ev_hash_1");

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
    assertEquals(garbageRes.status, 400);

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
    assertEquals(tamperedRes.status, 400);
    assertEquals((await tamperedRes.json()).code, "invalid_argument");

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
    assertEquals(submitRes.status, 200);
    const submitJson = await submitRes.json();
    assertEquals(typeof submitJson.eventHash, "string");
    assertEquals(submitJson.status, "accepted");

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
    assertEquals(checkJson.missingContentHashes.length, 1);
    assertEquals(checkJson.missingContentHashes[0], wasmItem.contentHash);

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
    assertEquals(forgedRes.status, 400);

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
    assertEquals(uploadJson.storedContentHashes.length, 1);
    assertEquals(uploadJson.storedContentHashes[0], wasmItem.contentHash);

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
    assertEquals(getContentJson.item.contentHash, wasmItem.contentHash);

    // 4. Virtual Wasm endpoint serves uploaded Wasm binary
    const wasmRes = await handleWorkerRequest(
      new Request(
        `https://definy.workers.dev/virtual/wasm/${wasmItem.contentHash}.wasm`,
      ),
      env,
      store,
    );
    assertEquals(wasmRes.status, 200);
    assertEquals(wasmRes.headers.get("Content-Type"), "application/wasm");
    assertEquals(
      wasmRes.headers.get("Cache-Control"),
      "public, max-age=31536000, immutable",
    );
    const wasmBytes = new Uint8Array(await wasmRes.arrayBuffer());
    assertEquals(wasmBytes.length, 4);
    assertEquals(wasmBytes[1], 0x61);
  },
);

Deno.test(
  "DebugService/SubmitUnverifiedEvent stores invalid signatures only when enabled",
  async () => {
    const samples = await createInvalidSignatureSamples();
    const post = (path: string, signedEventBytes: string): Request =>
      new Request(`https://definy.workers.dev/definy.v1.${path}`, {
        method: "POST",
        body: JSON.stringify({ signedEventBytes }),
      });

    const store = new WorkerStore();
    store.loadSeedBundle({ events: [], contents: [] });

    // 通常の SubmitEvent は不正な署名をすべて拒否する
    for (const sample of samples) {
      const res = await handleWorkerRequest(
        post("EventService/SubmitEvent", sample.signedEventBytes),
        {},
        store,
      );
      assertEquals(res.status, 400);
    }

    // フラグが無ければデバッグ用エンドポイントも拒否する
    const disabledRes = await handleWorkerRequest(
      post("DebugService/SubmitUnverifiedEvent", samples[0]!.signedEventBytes),
      {},
      store,
    );
    assertEquals(disabledRes.status, 403);

    // フラグがあれば形式だけ確認して保存し、GetEvents で配信される
    const env: Env = { DEFINY_ALLOW_UNVERIFIED_EVENTS: "true" };
    const garbageRes = await handleWorkerRequest(
      post(
        "DebugService/SubmitUnverifiedEvent",
        bytesToBase64(new Uint8Array([7, 8, 9])),
      ),
      env,
      store,
    );
    assertEquals(garbageRes.status, 400);
    for (const sample of samples) {
      const res = await handleWorkerRequest(
        post("DebugService/SubmitUnverifiedEvent", sample.signedEventBytes),
        env,
        store,
      );
      assertEquals(res.status, 200);
      assertEquals((await res.json()).status, "accepted");
    }

    const eventsRes = await handleWorkerRequest(
      new Request(
        "https://definy.workers.dev/definy.v1.EventService/GetEvents",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      ),
      env,
      store,
    );
    const { events } = (await eventsRes.json()) as {
      readonly events: ReadonlyArray<UnverifiedEventRecord>;
    };
    assertEquals(events.length, samples.length);
    for (const event of events) {
      assertEquals((await verifyEventRecord(event)).status, "invalid");
    }
  },
);
