import { describe, expect, it } from "vitest";
import {
  generateAccountCredentials,
  type AccountCredentials,
} from "../src/auth.ts";
import { base64ToBytes, bytesToBase64 } from "../src/base64.ts";
import { createSignedSingleModuleCommitEvent } from "../src/test_commit.ts";
import { DefinyClient } from "./test_definy_client.ts";

type Fixture = {
  readonly client: DefinyClient;
  readonly credentials: AccountCredentials;
  readonly eventHash: string;
  readonly tamperedClient: DefinyClient;
};

/** 署名済みコミット 1 件だけを持つ偽の definy サーバー越しのクライアント */
async function makeFixture(): Promise<Fixture> {
  const credentials = await generateAccountCredentials("mcp-tester");
  const timeSeconds = 1762000000;
  const signed = await createSignedSingleModuleCommitEvent(
    {
      credentials,
      moduleName: "lib",
      moduleDescription: [],
      message: "initial commit",
      parts: [
        {
          name: "answer",
          description: [],
          partType: { "#type_number": null },
          expression: { "#number": 42 },
        },
      ],
    },
    timeSeconds,
  );
  const eventHash = signed.eventHash;
  const item = {
    eventHash,
    signedEventBytes: signed.signedEventBytes,
    accountId: credentials.accountId,
    eventType: "project_commit",
    createdAtRfc3339: new Date(timeSeconds * 1000).toISOString(),
    timeMs: timeSeconds * 1000,
  };
  const contents = new Map(
    [...signed.contents.values()].map((c) => [c.contentHash, c]),
  );

  const makeFetch =
    (latestEvent: typeof item): typeof fetch =>
    async (input, init) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<
        string,
        unknown
      >;
      const json = (value: unknown): Response =>
        new Response(JSON.stringify(value), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      if (url.endsWith("/GetProjectBranches")) {
        return json({
          branches: [
            {
              projectName: "lib",
              branch: "main",
              creatorAccountId: credentials.accountId,
              commitCount: 1,
              latestEvent,
            },
          ],
        });
      }
      if (url.endsWith("/GetEvents")) {
        return json({ events: [latestEvent] });
      }
      if (url.endsWith("/GetEvent")) {
        return json(body.eventHash === eventHash ? { event: latestEvent } : {});
      }
      if (url.endsWith("/GetContent")) {
        const hashes = body.contentHashes as Array<string>;
        return json({
          items: hashes.flatMap((h) => {
            const found = contents.get(h);
            return found === undefined ? [] : [found];
          }),
        });
      }
      return new Response("not found", { status: 404 });
    };

  // 署名済みバイト列を 1 バイト書き換えたもの (署名もハッシュも一致しない)
  const tamperedBytes = base64ToBytes(signed.signedEventBytes);
  const lastIndex = tamperedBytes.length - 1;
  tamperedBytes[lastIndex] = (tamperedBytes[lastIndex] ?? 0) ^ 0xff;
  const tamperedItem = {
    ...item,
    signedEventBytes: bytesToBase64(tamperedBytes),
  };

  return {
    client: new DefinyClient({
      baseUrl: "https://example.test",
      fetchFn: makeFetch(item),
    }),
    credentials,
    eventHash,
    tamperedClient: new DefinyClient({
      baseUrl: "https://example.test",
      fetchFn: makeFetch(tamperedItem),
    }),
  };
}

describe("DefinyClient", () => {
  it("ブランチ一覧で最新コミットを検証し、プロジェクトの内容を CAS から解決する", async () => {
    const { client, credentials, eventHash } = await makeFixture();
    const branches = await client.listBranches();
    expect(branches).toHaveLength(1);
    expect(branches[0]?.latestEvent.verification.status).toBe("valid");
    expect(branches[0]?.latestEvent.commit?.projectName).toBe("lib");

    const snapshot = await client.getProjectSnapshot("lib");
    expect(snapshot?.eventHash).toBe(eventHash);
    expect(snapshot?.accountId).toBe(credentials.accountId);
    const part = snapshot?.modules[0]?.parts[0];
    expect(part?.name).toBe("answer");
    expect(part?.content?.partType).toEqual({ "#type_number": null });
    expect(part?.content?.expression).toEqual({ "#number": 42 });
  });

  it("署名が不正なイベントは検証失敗になり、中身を使わない", async () => {
    const { tamperedClient } = await makeFixture();
    const branches = await tamperedClient.listBranches();
    expect(branches[0]?.latestEvent.verification.status).toBe("invalid");
    expect(branches[0]?.latestEvent.commit).toBeNull();
    expect(await tamperedClient.getProjectSnapshot("lib")).toBeNull();

    const events = await tamperedClient.listEvents({});
    expect(events[0]?.verification.status).toBe("invalid");
    expect(events[0]?.commit).toBeNull();
  });

  it("無いイベントは null", async () => {
    const { client } = await makeFixture();
    expect(await client.getEvent("no-such-hash")).toBeNull();
  });
});
