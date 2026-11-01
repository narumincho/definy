import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { base64ToBytes } from "../src/base64.ts";
import { encodeCborItem } from "../src/cbor.ts";
import { compileSeedFunction } from "../src/event_check.ts";
import {
  decodeEventContent,
  encodeEventContent,
} from "../src/event_content.ts";
import {
  deriveModuleIdBytes,
  deriveModulePartId,
  derivePartIds,
} from "../src/part_ids.ts";
import { loadSeedPartExpressions } from "../src/seed_parts.ts";
import { parseSignedEventMetadata } from "../src/signed_event.ts";
import {
  createStage1Compiler,
  instantiateCompiledFunction,
} from "../src/stage1_compiler.ts";
import { loadTestSeedBundle } from "./test_runtime.ts";
import { decodeStoredCommit } from "./commit_store.ts";

const seedExpressions = await loadSeedPartExpressions();
const decodeModule = new WebAssembly.Module(
  new Uint8Array(
    compileSeedFunction({
      compiler: createStage1Compiler(
        new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
      ),
      partId: deriveModulePartId(
        deriveModuleIdBytes("definy"),
        "decode-signed-event",
      ),
      resolvePart: (id) => seedExpressions.get(id),
    }),
  ),
);

/** definy の `definy.decode-signed-event` で読む */
function decodeInDefiny(bytes: Uint8Array): unknown {
  const instance = instantiateCompiledFunction(decodeModule);
  return instance.read(
    instance.call({ bytes: instance.writeArgument([...bytes]) }),
  );
}

const invalid = (message: string) => ({ "#invalid": message });

const signed = (signedEvent: unknown): Uint8Array =>
  encodeCborItem(signedEvent);
const inner = (event: unknown) => ({
  signature: new Uint8Array(64),
  event_binary: { __tag: 24, value: encodeCborItem(event) },
});
const accountId = new Uint8Array(32).fill(3);
const createAccount = { "#create_account": { account_name: "a" } };

describe("definy.decode-signed-event", () => {
  it("seed のイベントを TypeScript (src/signed_event.ts) と同じに読む", async () => {
    for (const event of (await loadTestSeedBundle()).events) {
      const bytes = base64ToBytes(event.signedEventBytes);
      const meta = parseSignedEventMetadata(bytes);
      const decoded = decodeInDefiny(bytes) as {
        readonly "#decoded": {
          readonly account_id_bytes: ReadonlyArray<number>;
          readonly time_ms: number;
          readonly signature: ReadonlyArray<number>;
          readonly content: unknown;
        };
      };
      expect(decoded["#decoded"].time_ms).toBe(meta.timeMs);
      expect(decoded["#decoded"].signature).toHaveLength(64);
      expect(decodeEventContent(decoded["#decoded"].content)?.type).toBe(
        meta.eventType,
      );
      expect(decoded["#decoded"].content).toEqual(
        encodeEventContent(
          decodeEventContent(decoded["#decoded"].content) ??
            (() => {
              throw new Error("not an event content");
            })(),
        ),
      );
    }
  });

  it("128 KB のイベントも読める", async () => {
    const largest = (await loadTestSeedBundle()).events
      .map((event) => base64ToBytes(event.signedEventBytes))
      .reduce((a, b) => (a.length < b.length ? b : a));
    expect(decodeInDefiny(largest)).toHaveProperty("#decoded");
  });

  it("形式が違う SignedEvent は理由を返す", () => {
    const event = {
      account_id: accountId,
      time: { __tag: 1, value: 1000 },
      content: createAccount,
    };
    expect(decodeInDefiny(signed(inner(event)))).toEqual({
      "#decoded": {
        signature: Array.from({ length: 64 }, () => 0),
        message: [...encodeCborItem(event)],
        account_id_bytes: [...accountId],
        time_ms: 1_000_000,
        content: createAccount,
      },
    });
    // 秒は浮動小数でも良い (Math.round(秒 * 1000) ミリ秒)
    for (const seconds of [1548909361.005, 1548909361.5, 0.0004, 1e-300]) {
      expect(
        decodeInDefiny(
          signed(inner({ ...event, time: { __tag: 1, value: seconds } })),
        ),
      ).toMatchObject({
        "#decoded": { time_ms: Math.round(seconds * 1000) },
      });
    }
    expect(decodeInDefiny(new Uint8Array([0xa1]))).toEqual(
      invalid("malformed CBOR"),
    );
    expect(
      decodeInDefiny(new Uint8Array([...signed(inner(event)), 0])),
    ).toEqual(invalid("trailing bytes after SignedEvent"));
    expect(
      decodeInDefiny(signed({ ...inner(event), event_binary: "x" })),
    ).toEqual(invalid("event_binary must be CBOR tag 24"));
    expect(
      decodeInDefiny(
        signed({ ...inner(event), event_binary: { __tag: 24, value: "x" } }),
      ),
    ).toEqual(invalid("event_binary must wrap bytes"));
    expect(
      decodeInDefiny(
        signed({ ...inner(event), signature: new Uint8Array(63) }),
      ),
    ).toEqual(invalid("signature must be 64 bytes"));
    expect(decodeInDefiny(signed(inner([1])))).toEqual(
      invalid("inner event must be a map"),
    );
    expect(
      decodeInDefiny(
        signed(inner({ ...event, account_id: new Uint8Array(31) })),
      ),
    ).toEqual(invalid("account_id must be 32 bytes"));
    for (const time of [
      1000,
      { __tag: 1, value: -1.5 },
      { __tag: 0, value: 1 },
    ]) {
      expect(decodeInDefiny(signed(inner({ ...event, time })))).toEqual(
        invalid("time must be CBOR tag 1 epoch seconds"),
      );
    }
    expect(decodeInDefiny(signed(inner({ ...event, time: "x" })))).toEqual(
      invalid("time must be CBOR tag 1 epoch seconds"),
    );
    expect(
      decodeInDefiny(
        signed(
          inner({
            ...event,
            content: { "#create_account": { account_name: 1 } },
          }),
        ),
      ),
    ).toEqual(invalid("content must be a value of core.event-content"));
  });
});

describe("definy.decode-stored-commit (decodeStoredCommit)", () => {
  it("seed のコミットを TypeScript と同じに読み, パーツに core.module-part-ids の ID を付ける", async () => {
    const deriver = new WebAssembly.Module(
      readFileSync("wasm/part_id_deriver.wasm"),
    );
    let commits = 0;
    for (const event of (await loadTestSeedBundle()).events) {
      const decoded = decodeStoredCommit(event.signedEventBytes);
      const meta = parseSignedEventMetadata(
        base64ToBytes(event.signedEventBytes),
      );
      const content = decodeEventContent(
        (
          decodeInDefiny(base64ToBytes(event.signedEventBytes)) as {
            readonly "#decoded": { readonly content: unknown };
          }
        )["#decoded"].content,
      );
      if (content?.type !== "project_commit") {
        expect(decoded).toBeNull();
        continue;
      }
      commits += 1;
      const ids = derivePartIds(
        deriver,
        content.commit.modules.map((module) => ({
          moduleName: module.name,
          partNames: module.parts.map((part) => part.name),
        })),
      );
      expect(decoded).toEqual({
        accountId: meta.accountId,
        projectName: content.commit.projectName,
        moduleNames: content.commit.modules.map((module) => module.name),
        moduleIds: ids.map((id) => id.moduleId),
        branch: content.commit.branch,
        timeMs: meta.timeMs,
        parts: content.commit.modules.flatMap((module, i) =>
          module.parts.map((part, j) => ({
            partId: ids[i]!.partIds[j]!,
            moduleId: ids[i]!.moduleId,
            name: `${module.name}.${part.name}`,
            moduleName: module.name,
            moduleVisibility: module.visibility,
            contentHash: part.contentHash,
          })),
        ),
      });
    }
    expect(commits).toBeGreaterThan(0);
    expect(decodeStoredCommit("not base64!")).toBeNull();
  });
});
