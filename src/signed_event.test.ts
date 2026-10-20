import { describe, expect, it } from "vitest";
import {
  createSignedAccountEvent,
  generateAccountCredentials,
} from "./auth.ts";
import { base64ToBytes, sha256EventHashId } from "./cbor.ts";
import {
  createInvalidSignatureSamples,
  type InvalidSignatureSample,
} from "./invalid_signature_samples.ts";
import {
  parseSignedEventMetadata,
  verifyEventRecord,
  type UnverifiedEventRecord,
} from "./signed_event.ts";
import { loadTestSeedBundle } from "../worker/test_runtime.ts";

/** サーバーが正直にメタデータを付けた場合の `GetEvents` の 1 件 */
async function honestRecord(
  signedEventBytes: string,
): Promise<UnverifiedEventRecord> {
  const bytes = base64ToBytes(signedEventBytes);
  const meta = parseSignedEventMetadata(bytes);
  return {
    eventHash: await sha256EventHashId(bytes),
    signedEventBytes,
    accountId: meta.accountId,
    eventType: meta.eventType,
    timeMs: meta.timeMs,
  };
}

describe("verifyEventRecord", () => {
  it("accepts every builtin seed event", async () => {
    for (const event of (await loadTestSeedBundle()).events) {
      expect(await verifyEventRecord(event)).toEqual({ status: "valid" });
    }
  });

  it("accepts a correctly signed event", async () => {
    const creds = await generateAccountCredentials("tester");
    const { signedEventBytes } = await createSignedAccountEvent(creds);
    expect(
      await verifyEventRecord(await honestRecord(signedEventBytes)),
    ).toEqual({ status: "valid" });
  });

  it("rejects every invalid signature sample", async () => {
    const impersonated = await generateAccountCredentials("victim");
    const samples: ReadonlyArray<InvalidSignatureSample> =
      await createInvalidSignatureSamples({
        impersonatedAccountId: impersonated.accountId,
      });
    expect(samples.map((s) => s.kind)).toEqual([
      "flipped_signature",
      "tampered_content",
      "impersonated_account",
    ]);
    for (const sample of samples) {
      const record = await honestRecord(sample.signedEventBytes);
      expect(await verifyEventRecord(record)).toEqual({
        status: "invalid",
        reason: "Ed25519 signature verification failed",
      });
    }
    const impersonation = await honestRecord(samples[2]!.signedEventBytes);
    expect(impersonation.accountId).toBe(impersonated.accountId);
  });

  it("rejects metadata that does not match the signed event", async () => {
    const creds = await generateAccountCredentials("tester");
    const other = await generateAccountCredentials("other");
    const record = await honestRecord(
      (await createSignedAccountEvent(creds)).signedEventBytes,
    );
    expect(
      (await verifyEventRecord({ ...record, eventHash: "x" })).status,
    ).toBe("invalid");
    expect(
      (await verifyEventRecord({ ...record, accountId: other.accountId }))
        .status,
    ).toBe("invalid");
    expect(
      (await verifyEventRecord({ ...record, eventType: "module_commit" }))
        .status,
    ).toBe("invalid");
    expect(
      (await verifyEventRecord({ ...record, timeMs: record.timeMs + 1000 }))
        .status,
    ).toBe("invalid");
  });
});
