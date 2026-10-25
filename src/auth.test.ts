import { describe, expect, it, vi } from "vitest";
import {
  generateAccountCredentials,
  importAccountCredentials,
  createSignedAccountEvent,
  submitSignedEvent,
} from "./auth.ts";
import {
  base64ToBytes,
  decodeCborItem,
  extractCreateAccount,
  extractProjectCommit,
  toUint8Array,
} from "./cbor.ts";
import { verifySignedEvent } from "../worker/cbor.ts";
import { createSignedSingleModuleCommitEvent } from "./test_commit.ts";
import { cachedContent } from "./content_store.ts";

describe("auth and signed event pipeline", () => {
  it("generates and re-imports Ed25519 credentials", async () => {
    const creds = await generateAccountCredentials("alice");
    expect(creds.accountName).toBe("alice");
    expect(creds.accountId.length).toBeGreaterThan(30);
    expect(creds.secretKeyBase64.length).toBeGreaterThan(30);

    const reimported = await importAccountCredentials(
      creds.secretKeyBase64,
      "alice",
    );
    expect(reimported.accountId).toBe(creds.accountId);
    expect(reimported.accountName).toBe("alice");
  });

  it("creates, signs, and decodes CreateAccount events", async () => {
    const creds = await generateAccountCredentials("bob");
    const { signedEventBytes, eventHash } = await createSignedAccountEvent(
      creds,
      1700000000,
    );

    expect(typeof eventHash).toBe("string");
    expect(eventHash.length).toBeGreaterThan(20);

    // Verify with extractCreateAccount
    const extracted = extractCreateAccount(signedEventBytes);
    expect(extracted).not.toBeNull();
    expect(extracted?.accountId).toBe(creds.accountId);
    expect(extracted?.accountName).toBe("bob");

    // Verify signature and metadata with worker's verifySignedEvent
    const meta = await verifySignedEvent(base64ToBytes(signedEventBytes));
    expect(meta.accountId).toBe(creds.accountId);
    expect(meta.eventType).toBe("create_account");
    expect(meta.timeMs).toBe(1700000000000);

    // Verify Ed25519 signature cryptographically
    const [signedRaw] = decodeCborItem(base64ToBytes(signedEventBytes));
    const signedObj = signedRaw as {
      signature: Uint8Array;
      event_binary: { value: Uint8Array };
    };
    const pubKey = await crypto.subtle.importKey(
      "raw",
      base64ToBytes(creds.accountId) as unknown as BufferSource,
      { name: "Ed25519" },
      true,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "Ed25519" },
      pubKey,
      signedObj.signature as unknown as BufferSource,
      toUint8Array(signedObj.event_binary.value)! as unknown as BufferSource,
    );
    expect(valid).toBe(true);
  });

  it("creates, signs, and decodes ProjectCommit events", async () => {
    const creds = await generateAccountCredentials("carol");
    const { signedEventBytes, eventHash, contents } =
      await createSignedSingleModuleCommitEvent(
        {
          credentials: creds,
          moduleName: "math",
          moduleDescription: [{ language: "en", text: "Math functions" }],
          message: "Add multiply part",
          parentCommitHash: "parent-hash-123",
          parts: [
            {
              name: "multiply",
              description: [
                { language: "en", text: "Multiplies two numbers" },
                { language: "ja", text: "2 つの数を掛ける" },
              ],
              partType: { "#number": null },
              expression: { "#number": 42 },
            },
          ],
        },
        1700000005,
      );

    expect(typeof eventHash).toBe("string");

    // Verify with extractProjectCommit
    const project = extractProjectCommit(signedEventBytes);
    expect(project).not.toBeNull();
    expect(project?.projectName).toBe("math");
    expect(project?.message).toBe("Add multiply part");
    expect(project?.parentCommitHash).toBe("parent-hash-123");
    const commit = project?.modules[0];
    expect(commit?.name).toBe("math");
    expect(commit?.parts.length).toBe(1);
    expect(commit?.parts[0]?.name).toBe("multiply");
    // 言語ごとの説明文は連結されずそのまま往復する
    expect(commit?.description).toEqual([
      { language: "en", text: "Math functions" },
    ]);
    // パーツの中身は content hash だけがコミットに入り, 中身は CAS に預ける
    expect(commit?.parts[0]?.unresolved).toBe(true);
    const contentHash = commit?.parts[0]?.contentHash ?? "";
    expect([...contents.keys()]).toEqual([contentHash]);
    expect(cachedContent(contentHash)?.description).toEqual([
      { language: "en", text: "Multiplies two numbers" },
      { language: "ja", text: "2 つの数を掛ける" },
    ]);

    // Verify signature and metadata with worker's verifySignedEvent
    const meta = await verifySignedEvent(base64ToBytes(signedEventBytes));
    expect(meta.accountId).toBe(creds.accountId);
    expect(meta.eventType).toBe("project_commit");
    expect(meta.timeMs).toBe(1700000005000);
  });

  it("submits signed event via fetch and parses response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        eventHash: "mock-hash-xyz",
        status: "accepted",
      }),
    });

    const res = await submitSignedEvent(
      "dummy-base64",
      mockFetch as unknown as typeof fetch,
    );
    expect(res.status).toBe("accepted");
    expect(res.eventHash).toBe("mock-hash-xyz");
    expect(mockFetch).toHaveBeenCalledWith(
      "/definy.v1.EventService/SubmitEvent",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
