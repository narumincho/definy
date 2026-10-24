import { describe, expect, it } from "vitest";
import {
  generateAccountCredentials,
  importPrivateKeyFromSecretKey,
} from "./auth.ts";
import { base64ToBytes, encodeCborItem } from "./cbor.ts";
import {
  decodeEventContent,
  encodeEventContent,
  type EventContent,
} from "./event_content.ts";
import { InvalidSignedEventError, verifySignedEvent } from "./signed_event.ts";

const moduleCommit: EventContent = {
  type: "module_commit",
  commit: {
    moduleName: "math",
    branch: "main",
    moduleDescription: [{ language: "en", text: "Math functions" }],
    message: "Add answer",
    parentCommitHash: null,
    mergedCommitHash: null,
    parts: [
      {
        name: "answer",
        description: [{ language: "ja", text: "答え" }],
        partType: { "#number": null },
        expression: { "#number": 42 },
        contentHash: null,
      },
      {
        name: "stored",
        description: [],
        partType: null,
        expression: null,
        contentHash: "AAAA",
      },
    ],
  },
};

/** 任意の `content` を正しく署名した SignedEvent (形の検査だけで拒否されることを確かめる) */
async function signRawContent(content: unknown): Promise<Uint8Array> {
  const credentials = await generateAccountCredentials("shape");
  const key = await importPrivateKeyFromSecretKey(credentials.secretKeyBase64);
  const innerBytes = encodeCborItem({
    account_id: base64ToBytes(credentials.accountId),
    time: { __tag: 1, value: 1700000000 },
    content,
  });
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "Ed25519" },
      key,
      innerBytes as unknown as BufferSource,
    ),
  );
  return encodeCborItem({
    signature,
    event_binary: { __tag: 24, value: innerBytes },
  });
}

describe("core.event-content", () => {
  it("モジュールのコミットは definy の値として往復する", () => {
    const encoded = encodeEventContent(moduleCommit);
    expect(encoded).toEqual({
      "#module_commit": {
        module_name: "math",
        branch: "main",
        module_description: [{ language: "en", text: "Math functions" }],
        message: "Add answer",
        parent_commit_hash: { "#none": null },
        merged_commit_hash: { "#none": null },
        parts: [
          {
            name: "answer",
            description: [{ language: "ja", text: "答え" }],
            part_type: { "#some": { "#number": null } },
            expression: { "#some": { "#number": 42 } },
            content_hash: { "#none": null },
          },
          {
            name: "stored",
            description: [],
            part_type: { "#none": null },
            expression: { "#none": null },
            content_hash: { "#some": "AAAA" },
          },
        ],
      },
    });
    expect(decodeEventContent(encoded)).toEqual(moduleCommit);
  });

  it("アカウントの作成は definy の値として往復する", () => {
    const content: EventContent = {
      type: "create_account",
      accountName: "alice",
    };
    expect(encodeEventContent(content)).toEqual({
      "#create_account": { account_name: "alice" },
    });
    expect(decodeEventContent(encodeEventContent(content))).toEqual(content);
  });

  it("core.event-content の形でない中身は読まない", () => {
    // 以前の形
    expect(
      decodeEventContent({ CreateAccount: { account_name: "alice" } }),
    ).toBeUndefined();
    // 式が core.expression の形でない
    const encoded = encodeEventContent(moduleCommit) as {
      readonly "#module_commit": { readonly parts: ReadonlyArray<object> };
    };
    const [answer] = encoded["#module_commit"].parts;
    expect(
      decodeEventContent({
        "#module_commit": {
          ...encoded["#module_commit"],
          parts: [{ ...answer, expression: { "#some": { "#nope": 1 } } }],
        },
      }),
    ).toBeUndefined();
    // seed の JSON だけで書けるパーツ名の参照はイベントには書けない
    expect(
      decodeEventContent({
        "#module_commit": {
          ...encoded["#module_commit"],
          parent_commit_hash: { "#some": { $part: "core.expression" } },
        },
      }),
    ).toBeUndefined();
  });

  it("署名が正しくても中身の形が違うイベントは拒否する", async () => {
    await expect(
      verifySignedEvent(
        await signRawContent({ CreateAccount: { account_name: "alice" } }),
      ),
    ).rejects.toThrow(InvalidSignedEventError);
    await expect(
      verifySignedEvent(await signRawContent(encodeEventContent(moduleCommit))),
    ).resolves.toMatchObject({
      eventType: "module_commit",
      referencedContentHashes: ["AAAA"],
    });
  });
});
