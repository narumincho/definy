/**
 * MCP ツールの定義 (docs/mcp.md)。読み取り系は全て検証付き
 * (`DefinyClient` が署名検証とコンテンツハッシュ検証をする)。
 * 検証に失敗したイベントは中身を出さず、検証状態だけを返す
 */
import type {
  DefinyClient,
  ProjectSnapshot,
  VerifiedEvent,
} from "./definy_client.ts";

export type ToolResult = {
  readonly content: ReadonlyArray<{
    readonly type: "text";
    readonly text: string;
  }>;
  readonly isError?: boolean;
};

export type ToolDefinition = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    readonly type: "object";
    readonly properties: Readonly<Record<string, unknown>>;
    readonly required?: ReadonlyArray<string>;
  };
  readonly handler: (
    args: Readonly<Record<string, unknown>>,
  ) => Promise<ToolResult>;
};

export function jsonResult(value: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function stringArg(
  args: Readonly<Record<string, unknown>>,
  name: string,
): string | undefined {
  const value = args[name];
  return typeof value === "string" && value !== "" ? value : undefined;
}

function numberArg(
  args: Readonly<Record<string, unknown>>,
  name: string,
): number | undefined {
  const value = args[name];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function eventSummary(event: VerifiedEvent): unknown {
  return {
    eventHash: event.eventHash,
    eventType: event.eventType,
    accountId: event.accountId,
    timeMs: event.timeMs,
    verification:
      event.verification.status === "valid"
        ? "valid"
        : `invalid: ${event.verification.reason}`,
    ...(event.commit !== null
      ? {
          commit: {
            projectName: event.commit.projectName,
            branch: event.commit.branch,
            message: event.commit.message,
            modules: event.commit.modules.map((m) => m.name),
          },
        }
      : {}),
  };
}

function snapshotSummary(
  snapshot: ProjectSnapshot,
  withExpressions: boolean,
): unknown {
  return {
    projectName: snapshot.projectName,
    branch: snapshot.branch,
    eventHash: snapshot.eventHash,
    accountId: snapshot.accountId,
    timeMs: snapshot.timeMs,
    message: snapshot.message,
    parentCommitHash: snapshot.parentCommitHash,
    mergedCommitHash: snapshot.mergedCommitHash,
    projectDescription: snapshot.projectDescription,
    modules: snapshot.modules.map((m) => ({
      name: m.name,
      description: m.description,
      visibility: m.visibility,
      parts: m.parts.map((p) => ({
        name: p.name,
        partIdHash: p.partIdHash,
        contentHash: p.contentHash,
        ...(p.content !== null
          ? {
              description: p.content.description,
              visibility: p.content.visibility,
              partType: p.content.partType,
              ...(withExpressions ? { expression: p.content.expression } : {}),
            }
          : { content: null }),
      })),
    })),
  };
}

export function createTools(
  client: DefinyClient,
): ReadonlyArray<ToolDefinition> {
  return [
    {
      name: "definy_list_projects",
      description:
        "List definy projects and their branches (creator account, commit count, latest commit). Every latest commit event is signature-verified; branches whose latest event fails verification are marked invalid and their contents are never shown.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const branches = await client.listBranches();
        const projects = new Map<string, Array<unknown>>();
        for (const b of branches) {
          const list = projects.get(b.projectName) ?? [];
          list.push({
            branch: b.branch,
            creatorAccountId: b.creatorAccountId,
            commitCount: b.commitCount,
            latestEvent: eventSummary(b.latestEvent),
          });
          projects.set(b.projectName, list);
        }
        return jsonResult(
          [...projects.entries()].map(([projectName, branches]) => ({
            projectName,
            branches,
          })),
        );
      },
    },
    {
      name: "definy_get_project",
      description:
        "Get the current content of a project branch: modules and parts with their types (expressions omitted; use definy_get_part for a part's expression). Part contents are resolved from the content-addressed store and hash-checked. Returns null when the project/branch does not exist or its latest commit fails verification.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string", description: "Project name" },
          branch: {
            type: "string",
            description: "Branch name (default: main)",
          },
        },
        required: ["project"],
      },
      handler: async (args) => {
        const project = stringArg(args, "project");
        if (project === undefined) return errorResult("project is required");
        const snapshot = await client.getProjectSnapshot(
          project,
          stringArg(args, "branch"),
        );
        if (snapshot === null) {
          if (await client.projectExists(project)) {
            return errorResult(
              `The latest commit of project ${project} did not verify, so its contents cannot be shown`,
            );
          }
          const branches = await client.listBranches();
          const names = [...new Set(branches.map((b) => b.projectName))].sort();
          return errorResult(
            `Project ${project} was not found. Existing projects: ${names.join(", ")}`,
          );
        }
        return jsonResult(snapshotSummary(snapshot, false));
      },
    },
    {
      name: "definy_get_part",
      description:
        "Get one part's full definition (description, type and expression) by its id in the form 'module.name'. Searches the given project's branch (or every project when project is omitted). The content is hash-checked before decoding.",
      inputSchema: {
        type: "object",
        properties: {
          part: { type: "string", description: "Part id, e.g. 'core.plus'" },
          project: { type: "string", description: "Project name (optional)" },
          branch: {
            type: "string",
            description: "Branch name (default: main)",
          },
        },
        required: ["part"],
      },
      handler: async (args) => {
        const partId = stringArg(args, "part");
        if (partId === undefined) return errorResult("part is required");
        const dot = partId.indexOf(".");
        if (dot < 0) {
          return errorResult("part must be in the form 'module.name'");
        }
        const moduleName = partId.slice(0, dot);
        const partName = partId.slice(dot + 1);
        const project = stringArg(args, "project");
        const branchName = stringArg(args, "branch");
        const candidates: Array<ProjectSnapshot | null> = [];
        if (project !== undefined) {
          candidates.push(await client.getProjectSnapshot(project, branchName));
        } else {
          const branches = await client.listBranches();
          const projectNames = [
            ...new Set(
              branches
                .filter(
                  (b) => branchName === undefined || b.branch === branchName,
                )
                .map((b) => b.projectName),
            ),
          ];
          for (const name of projectNames) {
            candidates.push(await client.getProjectSnapshot(name, branchName));
          }
        }
        for (const snapshot of candidates) {
          if (snapshot === null) continue;
          const module = snapshot.modules.find((m) => m.name === moduleName);
          const part = module?.parts.find((p) => p.name === partName);
          if (part !== undefined) {
            return jsonResult({
              part: partId,
              projectName: snapshot.projectName,
              branch: snapshot.branch,
              partIdHash: part.partIdHash,
              contentHash: part.contentHash,
              content: part.content,
            });
          }
        }
        return jsonResult(null);
      },
    },
    {
      name: "definy_list_events",
      description:
        "List recent events (newest first), each with its signature verification status. Contents of invalid events are never shown.",
      inputSchema: {
        type: "object",
        properties: {
          eventType: {
            type: "string",
            description: "Filter by event type, e.g. 'project_commit'",
          },
          limit: { type: "number", description: "Max events (default 50)" },
          offset: { type: "number", description: "Offset (default 0)" },
        },
      },
      handler: async (args) => {
        const events = await client.listEvents({
          eventType: stringArg(args, "eventType"),
          limit: numberArg(args, "limit"),
          offset: numberArg(args, "offset"),
        });
        return jsonResult(events.map(eventSummary));
      },
    },
    {
      name: "definy_get_event",
      description:
        "Get one event by its hash, with its signature verification status and, when valid and it is a project commit, the decoded commit summary.",
      inputSchema: {
        type: "object",
        properties: {
          eventHash: { type: "string", description: "Event hash" },
        },
        required: ["eventHash"],
      },
      handler: async (args) => {
        const eventHash = stringArg(args, "eventHash");
        if (eventHash === undefined)
          return errorResult("eventHash is required");
        const event = await client.getEvent(eventHash);
        return jsonResult(event === null ? null : eventSummary(event));
      },
    },
    {
      name: "definy_perf_recent_submits",
      description:
        "Operator-only performance investigation: the recent SubmitEvent records the definy server host has recorded (newest first). Each record has the total wasm/host milliseconds and a per-segment breakdown: for every service-io request tag, how often it occurred, the wasm ms spent running after it was answered, and the host ms spent servicing it. Unlike the other read tools this is operational data reported by the server itself (not signature-verified event data), so treat it as informational. Requires DEFINY_PERF_TOKEN on both the MCP server and the definy server (docs/performance-observability.md).",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max records (default 20, max 200)",
          },
          allRequests: {
            type: "boolean",
            description:
              "Include requests other than SubmitEvent too (default false)",
          },
        },
      },
      handler: async (args) => {
        try {
          const records = await client.listRecentPerfRecords({
            limit: numberArg(args, "limit") ?? 20,
            ...(args["allRequests"] === true
              ? {}
              : { pathContains: "SubmitEvent" }),
          });
          return jsonResult(records);
        } catch (error) {
          return errorResult(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    },
  ];
}
