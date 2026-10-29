import { describe, expect, it } from "vitest";
import {
  generateAccountCredentials,
  importPrivateKeyFromSecretKey,
} from "./auth.ts";
import { base64ToBytes, encodeCborItem } from "./cbor.ts";
import {
  decodeEventContent,
  decodePartContent,
  encodeEventContent,
  encodePartContent,
  type EventContent,
  type PartContent,
} from "./event_content.ts";
import { InvalidSignedEventError, verifySignedEvent } from "./signed_event.ts";

const projectCommit: EventContent = {
  type: "project_commit",
  commit: {
    projectName: "math",
    branch: "main",
    projectDescription: [{ language: "en", text: "Math project" }],
    message: "Add answer",
    parentCommitHash: null,
    mergedCommitHash: null,
    modules: [
      {
        name: "math",
        description: [{ language: "en", text: "Math functions" }],
        visibility: "private",
        parts: [
          {
            name: "answer",
            description: [],
            partType: null,
            expression: null,
            contentHash: "AAAA",
            unresolved: true,
          },
        ],
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
  it("プロジェクトのコミットは definy の値として往復する", () => {
    const encoded = encodeEventContent(projectCommit);
    expect(encoded).toEqual({
      "#project_commit": {
        project_name: "math",
        branch: "main",
        project_description: [{ language: "en", text: "Math project" }],
        message: "Add answer",
        parent_commit_hash: { "#none": null },
        merged_commit_hash: { "#none": null },
        modules: [
          {
            name: "math",
            description: [{ language: "en", text: "Math functions" }],
            visibility: { "#private": null },
            parts: [{ name: "answer", content_hash: "AAAA" }],
          },
        ],
      },
    });
    expect(decodeEventContent(encoded)).toEqual(projectCommit);
  });

  it("パーツの中身は definy の値 (core.part-content) として往復する", () => {
    const content: PartContent = {
      description: [{ language: "ja", text: "答え" }],
      visibility: "private",
      partType: { "#number": null },
      expression: { "#number": 42 },
    };
    const encoded = encodePartContent(content);
    expect(encoded).toEqual({
      description: [{ language: "ja", text: "答え" }],
      visibility: { "#private": null },
      part_type: { "#some": { "#type_number": null } },
      expression: { "#some": { "#number": 42 } },
    });
    expect(decodePartContent(encoded)).toEqual(content);
    // 式が core.expression の形でない
    expect(
      decodePartContent({
        ...(encoded as object),
        expression: { "#some": { "#nope": 1 } },
      }),
    ).toBeUndefined();
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
    const encoded = encodeEventContent(projectCommit) as {
      readonly "#project_commit": object;
    };
    // パーツの中身をコミットに直接書いた以前の形
    expect(
      decodeEventContent({
        "#project_commit": {
          ...encoded["#project_commit"],
          modules: [
            {
              name: "math",
              description: [],
              visibility: { "#public": null },
              parts: [
                {
                  name: "answer",
                  description: [],
                  visibility: { "#public": null },
                  part_type: { "#none": null },
                  expression: { "#none": null },
                  content_hash: { "#some": "AAAA" },
                },
              ],
            },
          ],
        },
      }),
    ).toBeUndefined();
    // 以前のモジュール単位のコミット
    expect(
      decodeEventContent({
        "#module_commit": {
          ...encoded["#project_commit"],
        },
      }),
    ).toBeUndefined();
    // seed の JSON だけで書けるパーツ名の参照はイベントには書けない
    expect(
      decodeEventContent({
        "#project_commit": {
          ...encoded["#project_commit"],
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
      verifySignedEvent(
        await signRawContent(encodeEventContent(projectCommit)),
      ),
    ).resolves.toMatchObject({
      eventType: "project_commit",
      referencedContentHashes: ["AAAA"],
    });
  });
});
