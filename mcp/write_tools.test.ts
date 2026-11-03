import { describe, expect, it } from "vitest";
import {
  generateAccountCredentials,
  submitProjectCommitEvent,
  type AccountCredentials,
} from "../src/auth.ts";
import { base64ToBytes } from "../src/base64.ts";
import { extractProjectCommit } from "../src/decoded_event.ts";
import { sha256EventHashId, sha256EventHashIdSync } from "../src/sha256.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import { createSignedSingleModuleCommitEvent } from "../src/test_commit.ts";
import { DefinyClient } from "./definy_client.ts";
import { createWriteTools } from "./write_tools.ts";
import type { ToolDefinition } from "./tools.ts";

type StoredEvent = {
  readonly eventHash: string;
  readonly signedEventBytes: string;
  readonly accountId: string;
  readonly eventType: string;
  readonly createdAtRfc3339: string;
  readonly timeMs: number;
};

/**
 * 署名検証とブランチの規則 (docs/branch.md) だけを実装した偽の definy サーバー。
 * 型検査はしない (実サーバーで確認する)
 */
class FakeDefinyServer {
  readonly #events = new Map<string, StoredEvent>();
  readonly #contents = new Map<
    string,
    { contentHash: string; contentBytes: string }
  >();
  readonly #branches = new Map<
    string,
    { creatorAccountId: string; latestHash: string; count: number }
  >();
  readonly #projectCommits = new Map<string, Set<string>>();

  readonly fetchFn: typeof fetch = async (input, init) => {
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
        branches: [...this.#branches.entries()].map(([key, b]) => {
          const [projectName, branch] = key.split("\0");
          return {
            projectName,
            branch,
            creatorAccountId: b.creatorAccountId,
            commitCount: b.count,
            latestEvent: this.#events.get(b.latestHash),
          };
        }),
      });
    }
    if (url.endsWith("/GetEvents")) {
      const all = [...this.#events.values()].reverse();
      const filtered =
        body.eventType === undefined
          ? all
          : all.filter((e) => e.eventType === body.eventType);
      const offset = Number(body.offset ?? 0);
      const limit = Number(body.limit ?? 50);
      return json({ events: filtered.slice(offset, offset + limit) });
    }
    if (url.endsWith("/GetEvent")) {
      const event = this.#events.get(String(body.eventHash));
      return json(event === undefined ? {} : { event });
    }
    if (url.endsWith("/GetContent")) {
      const hashes = body.contentHashes as Array<string>;
      return json({
        items: hashes.flatMap((h) => {
          const found = this.#contents.get(h);
          return found === undefined ? [] : [found];
        }),
      });
    }
    if (url.endsWith("/UploadContent")) {
      const items = body.items as Array<{
        contentHash: string;
        contentBytes: string;
      }>;
      for (const item of items) {
        if (
          sha256EventHashIdSync(base64ToBytes(item.contentBytes)) !==
          item.contentHash
        ) {
          return new Response("content hash mismatch", { status: 400 });
        }
        this.#contents.set(item.contentHash, item);
      }
      return json({ storedContentHashes: items.map((i) => i.contentHash) });
    }
    if (url.endsWith("/SubmitEvent")) {
      return json(await this.#submit(String(body.signedEventBytes)));
    }
    return new Response("not found", { status: 404 });
  };

  async #submit(signedEventBytes: string) {
    const bytes = base64ToBytes(signedEventBytes);
    const eventHash = await sha256EventHashId(bytes);
    const { meta } = await decodeVerifiedSignedEvent(bytes);
    if (meta.eventType === "project_commit") {
      const missing = meta.referencedContentHashes.filter(
        (h) => !this.#contents.has(h),
      );
      if (missing.length > 0) {
        return {
          eventHash,
          status: "missing_content",
          missingContentHashes: missing,
        };
      }
      const commit = extractProjectCommit(signedEventBytes);
      if (commit === null) throw new Error("undecodable commit");
      const key = `${commit.projectName}\0${commit.branch}`;
      const branch = this.#branches.get(key);
      const projectCommits =
        this.#projectCommits.get(commit.projectName) ?? new Set<string>();
      if (branch !== undefined) {
        if (branch.creatorAccountId !== meta.accountId) {
          return { eventHash, status: "not_branch_creator" };
        }
        if (commit.parentCommitHash !== branch.latestHash) {
          return { eventHash, status: "parent_commit_mismatch" };
        }
      } else if (projectCommits.size > 0) {
        if (
          commit.parentCommitHash === null ||
          !projectCommits.has(commit.parentCommitHash)
        ) {
          return { eventHash, status: "parent_commit_mismatch" };
        }
      } else if (commit.branch !== "main" || commit.parentCommitHash !== null) {
        return { eventHash, status: "first_branch_must_be_main" };
      }
      this.#branches.set(key, {
        creatorAccountId: branch?.creatorAccountId ?? meta.accountId,
        latestHash: eventHash,
        count: (branch?.count ?? 0) + 1,
      });
      projectCommits.add(eventHash);
      this.#projectCommits.set(commit.projectName, projectCommits);
    }
    this.#events.set(eventHash, {
      eventHash,
      signedEventBytes,
      accountId: meta.accountId,
      eventType: meta.eventType,
      createdAtRfc3339: meta.createdAtRfc3339,
      timeMs: meta.timeMs,
    });
    return { eventHash, status: "accepted" };
  }
}

async function setup() {
  const server = new FakeDefinyServer();
  const client = new DefinyClient({
    baseUrl: "https://example.test",
    fetchFn: server.fetchFn,
  });
  const credentials = await generateAccountCredentials("mcp-bot");
  const tools = new Map(
    createWriteTools(client, credentials).map((t) => [t.name, t]),
  );
  const call = async (
    name: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    const tool = tools.get(name) as ToolDefinition;
    const result = await tool.handler(args);
    if (result.isError === true) {
      throw new Error(result.content[0]?.text ?? "tool error");
    }
    return JSON.parse(result.content[0]?.text ?? "{}") as Record<
      string,
      unknown
    >;
  };
  return { server, client, credentials, tools, call };
}

describe("createWriteTools", () => {
  it("アカウントを自動で作り、新規プロジェクトへ最初のコミットができる", async () => {
    const { call, client, credentials } = await setup();
    const before = await call("definy_whoami", {});
    expect(before.accountId).toBe(credentials.accountId);
    expect(before.accountExistsOnServer).toBe(false);

    const committed = await call("definy_commit_parts", {
      project: "playground",
      message: "first",
      parts: [
        {
          module: "playground",
          name: "answer",
          partType: { "#type_number": null },
          expression: { "#number": 42 },
        },
      ],
    });
    expect(committed.status).toBe("accepted");

    const after = await call("definy_whoami", {});
    expect(after.accountExistsOnServer).toBe(true);

    const snapshot = await client.getProjectSnapshot("playground");
    expect(snapshot?.modules[0]?.parts[0]?.content?.expression).toEqual({
      "#number": 42,
    });

    // 同じブランチへの追随コミット (更新 + 削除) もできる
    const second = await call("definy_commit_parts", {
      project: "playground",
      message: "update",
      parts: [
        {
          module: "playground",
          name: "answer",
          partType: { "#type_number": null },
          expression: { "#number": 43 },
        },
        {
          module: "playground",
          name: "extra",
          partType: { "#type_string": null },
          expression: { "#text": "hi" },
        },
      ],
    });
    expect(second.status).toBe("accepted");
    const updated = await client.getProjectSnapshot("playground");
    expect(updated?.modules[0]?.parts.map((p) => p.name)).toEqual([
      "answer",
      "extra",
    ]);
    expect(updated?.modules[0]?.parts[0]?.content?.expression).toEqual({
      "#number": 43,
    });
  });

  it("他人のプロジェクトには自分のブランチを作ってから書く", async () => {
    const { server, call } = await setup();
    // 別のアカウントのプロジェクトを用意する
    const other = await generateAccountCredentials("someone");
    const otherClient = new DefinyClient({
      baseUrl: "https://example.test",
      fetchFn: server.fetchFn,
    });
    await otherClient.submitAccountCreation(other);
    const signed = await createSignedSingleModuleCommitEvent({
      credentials: other,
      projectName: "theirs",
      moduleName: "theirs",
      moduleDescription: [],
      message: "theirs",
      parts: [
        {
          name: "greeting",
          description: [],
          partType: { "#type_string": null },
          expression: { "#text": "hello" },
        },
      ],
    });
    const boundFetch: typeof fetch = (input, init) =>
      server.fetchFn(
        String(input).startsWith("http")
          ? String(input)
          : `https://example.test${String(input)}`,
        init,
      );
    const submitted = await submitProjectCommitEvent(
      signed.signedEventBytes,
      signed.contents,
      boundFetch,
    );
    expect(submitted.status).toBe("accepted");

    // 他人の main には直接書けない
    await expect(
      call("definy_commit_parts", {
        project: "theirs",
        message: "intrude",
        parts: [
          {
            module: "theirs",
            name: "greeting",
            partType: { "#type_string": null },
            expression: { "#text": "hacked" },
          },
        ],
      }),
    ).rejects.toThrow("belongs to another account");

    // 自分のブランチを作れば書ける
    const branch = await call("definy_create_branch", {
      project: "theirs",
      branch: "mcp-bot",
    });
    expect(branch.status).toBe("accepted");
    const committed = await call("definy_commit_parts", {
      project: "theirs",
      branch: "mcp-bot",
      message: "my change",
      parts: [
        {
          module: "theirs",
          name: "greeting",
          partType: { "#type_string": null },
          expression: { "#text": "hello from bot" },
        },
      ],
    });
    expect(committed.status).toBe("accepted");

    // 存在しないブランチへのコミットはブランチ作成を促す
    await expect(
      call("definy_commit_parts", {
        project: "theirs",
        branch: "no-such",
        message: "x",
        parts: [],
      }),
    ).rejects.toThrow("definy_create_branch");
  });

  it("loadAccountFromEnv は秘密鍵と名前が揃ったときだけ有効", async () => {
    const { loadAccountFromEnv } = await import("./write_tools.ts");
    const { generateAccountCredentials } = await import("../src/auth.ts");
    const generated: AccountCredentials =
      await generateAccountCredentials("env-bot");
    expect(await loadAccountFromEnv({})).toBeNull();
    expect(
      await loadAccountFromEnv({
        DEFINY_ACCOUNT_NAME: "env-bot",
      }),
    ).toBeNull();
    const loaded = await loadAccountFromEnv({
      DEFINY_ACCOUNT_SECRET_KEY: generated.secretKeyBase64,
      DEFINY_ACCOUNT_NAME: "env-bot",
    });
    expect(loaded?.accountId).toBe(generated.accountId);
  });
});
