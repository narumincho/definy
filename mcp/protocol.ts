/**
 * MCP (Model Context Protocol) の最小限の JSON-RPC 実装 (docs/mcp.md).
 * stdio 上の改行区切り JSON を想定し、初期化・ツール一覧・ツール呼び出しだけを扱う。
 * 依存パッケージを増やさないために自前で実装している
 */
import type { ToolDefinition, ToolResult } from "./tools.ts";

export const MCP_PROTOCOL_VERSION = "2025-03-26";

type JsonRpcId = string | number | null;

export type McpServer = {
  /** 1 行の JSON を受け取り、返すべき 1 行の JSON を返す。通知など返答不要なら `null` */
  readonly handleLine: (line: string) => Promise<string | null>;
};

function resultResponse(id: JsonRpcId, result: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

function errorResponse(id: JsonRpcId, code: number, message: string): string {
  return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
}

export function createMcpServer(params: {
  readonly tools: ReadonlyArray<ToolDefinition>;
  readonly serverName: string;
  readonly serverVersion: string;
}): McpServer {
  const toolsByName = new Map(params.tools.map((t) => [t.name, t]));

  const handleLine = async (line: string): Promise<string | null> => {
    const trimmed = line.trim();
    if (trimmed === "") return null;
    let message: {
      readonly id?: JsonRpcId;
      readonly method?: unknown;
      readonly params?: unknown;
    };
    try {
      message = JSON.parse(trimmed) as typeof message;
    } catch {
      return errorResponse(null, -32700, "Parse error");
    }
    const id = message.id ?? null;
    const isNotification = message.id === undefined;
    switch (message.method) {
      case "initialize": {
        const requested = (
          message.params as { readonly protocolVersion?: unknown } | undefined
        )?.protocolVersion;
        return resultResponse(id, {
          protocolVersion:
            typeof requested === "string" ? requested : MCP_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: {
            name: params.serverName,
            version: params.serverVersion,
          },
        });
      }
      case "ping":
        return isNotification ? null : resultResponse(id, {});
      case "tools/list":
        return resultResponse(id, {
          tools: params.tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });
      case "tools/call": {
        const callParams = message.params as
          | {
              readonly name?: unknown;
              readonly arguments?: Readonly<Record<string, unknown>>;
            }
          | undefined;
        const tool =
          typeof callParams?.name === "string"
            ? toolsByName.get(callParams.name)
            : undefined;
        if (tool === undefined) {
          return errorResponse(
            id,
            -32602,
            `Unknown tool: ${String(callParams?.name)}`,
          );
        }
        let toolResult: ToolResult;
        try {
          toolResult = await tool.handler(callParams?.arguments ?? {});
        } catch (e) {
          toolResult = {
            content: [
              {
                type: "text",
                text: e instanceof Error ? e.message : String(e),
              },
            ],
            isError: true,
          };
        }
        return resultResponse(id, toolResult);
      }
      default:
        return isNotification
          ? null
          : errorResponse(
              id,
              -32601,
              `Method not found: ${String(message.method)}`,
            );
    }
  };

  return { handleLine };
}
