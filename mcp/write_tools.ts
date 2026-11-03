/**
 * MCP サーバーの書き込み系ツール (docs/mcp.md)。
 * 署名はこのサーバーが持つ専用アカウントの鍵で行う (GitHub Apps 型)。
 * ユーザーの鍵は受け取らない。専用アカウントは自分のブランチにしか書けないことが
 * プロトコルで強制される (サーバー側でも検証される) ので、ここでのチェックは
 * 分かりやすいエラーを先に返すためのもので、安全性はそちらに依存する
 */
import {
  importAccountCredentials,
  type AccountCredentials,
  type CommitModuleParams,
} from "../src/auth.ts";
import type { DecodedPart } from "../src/decoded_event.ts";
import type { LocalizedText, Visibility } from "../src/event_content.ts";
import type { DefinyClient, ProjectSnapshot } from "./definy_client.ts";
import { jsonResult, type ToolDefinition } from "./tools.ts";

/**
 * 環境変数から専用アカウントを読む。
 * - `DEFINY_ACCOUNT_SECRET_KEY`: 秘密鍵 (ブラウザのログインと同じ URL-safe base64)
 * - `DEFINY_ACCOUNT_NAME`: アカウント名 (アカウント作成に使う)
 * どちらか欠けたら書き込みは無効 (`null`)
 */
export async function loadAccountFromEnv(
  env: Readonly<Record<string, string | undefined>>,
): Promise<AccountCredentials | null> {
  const secretKey = env.DEFINY_ACCOUNT_SECRET_KEY;
  const name = env.DEFINY_ACCOUNT_NAME;
  if (
    secretKey === undefined ||
    secretKey === "" ||
    name === undefined ||
    name === ""
  ) {
    return null;
  }
  return await importAccountCredentials(secretKey, name);
}

type PartInput = {
  readonly module: string;
  readonly name: string;
  readonly description?: LocalizedText;
  readonly visibility?: Visibility;
  readonly partType: unknown;
  readonly expression: unknown;
};

const localizedTextSchema = {
  type: "array",
  items: {
    type: "object",
    properties: { language: { type: "string" }, text: { type: "string" } },
    required: ["language", "text"],
  },
} as const;

/**
 * スナップショットのモジュールを、コミットに使える形に変換する。
 * 触っていないパーツは中身をデコードせず content hash のまま引き継ぐ
 * (コミットは元々 `{name, content_hash}` でパーツを指すので、これが正確な写しになる。
 * 定義の式を評価しないと中身が分からないパーツでも壊れない)
 */
function snapshotToModules(
  snapshot: ProjectSnapshot,
): Array<CommitModuleParams> {
  return snapshot.modules.map((m) => ({
    name: m.name,
    description: m.description,
    ...(m.visibility === "private" ? { visibility: "private" as const } : {}),
    parts: m.parts.map((p): DecodedPart => {
      if (p.contentHash === null) {
        throw new Error(
          `Part ${snapshot.projectName}/${m.name}.${p.name} has no content hash; cannot carry it over`,
        );
      }
      return {
        name: p.name,
        description: [],
        unresolved: true,
        contentHash: p.contentHash,
      };
    }),
  }));
}

export function createWriteTools(
  client: DefinyClient,
  credentials: AccountCredentials,
): ReadonlyArray<ToolDefinition> {
  let accountEnsured = false;

  /** アカウントがサーバーに無ければ作成イベントを送る (書き込みの前提) */
  const ensureAccount = async (): Promise<void> => {
    if (accountEnsured) return;
    const existing = await client.findAccountEvent(credentials.accountId);
    if (existing === null) {
      const result = await client.submitAccountCreation(credentials);
      if (result.status !== "accepted") {
        throw new Error(
          `Account creation was rejected with status: ${result.status}`,
        );
      }
    }
    accountEnsured = true;
  };

  const whoami: ToolDefinition = {
    name: "definy_whoami",
    description:
      "Show the dedicated account this MCP server signs with (account id and name), " +
      "and whether the account already exists on the server.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const existing = await client.findAccountEvent(credentials.accountId);
      return jsonResult({
        accountId: credentials.accountId,
        accountName: credentials.accountName,
        accountExistsOnServer: existing !== null,
      });
    },
  };

  const createBranch: ToolDefinition = {
    name: "definy_create_branch",
    description:
      "Create a new branch in an existing project, owned by this server's dedicated account. " +
      "The initial commit copies the source branch's current snapshot (same behavior as the web UI). " +
      "After creating it, use definy_commit_parts on the new branch.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        branch: { type: "string" },
        fromBranch: {
          type: "string",
          description: "Source branch to copy (defaults to main)",
        },
        message: { type: "string" },
      },
      required: ["project", "branch"],
    },
    handler: async (args) => {
      const project = String(args.project);
      const branch = String(args.branch);
      if (branch === "") throw new Error("branch name must not be empty");
      await ensureAccount();
      if ((await client.getBranch(project, branch)) !== undefined) {
        throw new Error(
          `Branch ${branch} already exists in project ${project}`,
        );
      }
      const fromBranch =
        typeof args.fromBranch === "string" ? args.fromBranch : "main";
      const snapshot = await client.getProjectSnapshot(project, fromBranch);
      if (snapshot === null) {
        throw new Error(
          `Project ${project} (branch ${fromBranch}) was not found, or its latest commit did not verify`,
        );
      }
      const result = await client.submitCommit({
        credentials,
        projectName: project,
        branch,
        projectDescription: snapshot.projectDescription,
        message:
          typeof args.message === "string"
            ? args.message
            : `Create branch ${branch}`,
        parentCommitHash: snapshot.eventHash,
        modules: snapshotToModules(snapshot),
      });
      if (result.status !== "accepted") {
        throw new Error(`Commit rejected with status: ${result.status}`);
      }
      return jsonResult({
        projectName: project,
        branch,
        eventHash: result.eventHash,
        status: result.status,
        creatorAccountId: credentials.accountId,
      });
    },
  };

  const commitParts: ToolDefinition = {
    name: "definy_commit_parts",
    description:
      "Commit part additions/updates (and optional deletions) to a branch owned by this server's " +
      "dedicated account. The commit contains the branch's full current snapshot with the changes applied. " +
      "partType and expression use the same JSON shape that definy_get_part returns. " +
      "If the project does not exist yet, it is created on main with these parts as its first commit.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        branch: {
          type: "string",
          description: "Target branch (defaults to main)",
        },
        message: { type: "string" },
        projectDescription: localizedTextSchema,
        parts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              module: { type: "string" },
              name: { type: "string" },
              description: localizedTextSchema,
              visibility: { type: "string", enum: ["public", "private"] },
              partType: {
                description:
                  "Part type in the JSON shape returned by definy_get_part",
              },
              expression: {
                description:
                  "Expression in the JSON shape returned by definy_get_part",
              },
            },
            required: ["module", "name", "partType", "expression"],
          },
        },
        deleteParts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              module: { type: "string" },
              name: { type: "string" },
            },
            required: ["module", "name"],
          },
        },
      },
      required: ["project", "message", "parts"],
    },
    handler: async (args) => {
      const project = String(args.project);
      const branch = typeof args.branch === "string" ? args.branch : "main";
      const message = String(args.message);
      const parts = (args.parts ?? []) as ReadonlyArray<PartInput>;
      const deleteParts = (args.deleteParts ?? []) as ReadonlyArray<{
        readonly module: string;
        readonly name: string;
      }>;
      await ensureAccount();

      const existingBranch = await client.getBranch(project, branch);
      let modules: Array<CommitModuleParams>;
      let parentCommitHash: string | null;
      let projectDescription: LocalizedText;
      if (existingBranch !== undefined) {
        if (existingBranch.creatorAccountId !== credentials.accountId) {
          throw new Error(
            `Branch ${branch} of project ${project} belongs to another account ` +
              `(creator ${existingBranch.creatorAccountId}); create your own branch with definy_create_branch first`,
          );
        }
        const snapshot = await client.getProjectSnapshot(project, branch);
        if (snapshot === null) {
          throw new Error(
            `The latest commit of ${project}/${branch} did not verify; refusing to build on it`,
          );
        }
        modules = snapshotToModules(snapshot);
        parentCommitHash = snapshot.eventHash;
        projectDescription = snapshot.projectDescription;
      } else if (await client.projectExists(project)) {
        throw new Error(
          `Branch ${branch} does not exist in project ${project}; create it with definy_create_branch first`,
        );
      } else {
        if (branch !== "main") {
          throw new Error(
            "The first branch of a new project must be main (docs/branch.md)",
          );
        }
        modules = [];
        parentCommitHash = null;
        projectDescription =
          (args.projectDescription as LocalizedText | undefined) ?? [];
      }

      // 削除してから追加・更新を重ねる (同じパーツが両方にあれば追加が勝つ)
      const byModule = new Map(
        modules.map((m) => [m.name, { ...m, parts: [...m.parts] }]),
      );
      for (const del of deleteParts) {
        const mod = byModule.get(del.module);
        if (mod !== undefined) {
          mod.parts = mod.parts.filter((p) => p.name !== del.name);
        }
      }
      for (const part of parts) {
        let mod = byModule.get(part.module);
        if (mod === undefined) {
          mod = { name: part.module, description: [], parts: [] };
          byModule.set(part.module, mod);
        }
        const decoded: DecodedPart = {
          name: part.name,
          description: part.description ?? [],
          ...(part.visibility === "private"
            ? { visibility: "private" as const }
            : {}),
          partType: part.partType,
          expression: part.expression,
        };
        const index = mod.parts.findIndex((p) => p.name === part.name);
        if (index >= 0) mod.parts[index] = decoded;
        else mod.parts.push(decoded);
      }

      const result = await client.submitCommit({
        credentials,
        projectName: project,
        branch,
        projectDescription,
        message,
        parentCommitHash,
        modules: [...byModule.values()],
      });
      if (result.status !== "accepted") {
        throw new Error(`Commit rejected with status: ${result.status}`);
      }
      return jsonResult({
        projectName: project,
        branch,
        eventHash: result.eventHash,
        status: result.status,
        accountId: credentials.accountId,
      });
    },
  };

  return [whoami, createBranch, commitParts];
}
