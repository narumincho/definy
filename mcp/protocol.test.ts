import { describe, expect, it } from "vitest";
import { createMcpServer } from "./protocol.ts";
import type { ToolDefinition } from "./tools.ts";

const echoTool: ToolDefinition = {
  name: "echo",
  description: "Echo back the text argument",
  inputSchema: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  handler: async (args) => ({
    content: [{ type: "text", text: `echo: ${String(args.text)}` }],
  }),
};

function makeServer() {
  return createMcpServer({
    tools: [echoTool],
    serverName: "test-server",
    serverVersion: "0.0.1",
  });
}

async function call(
  server: ReturnType<typeof makeServer>,
  message: unknown,
): Promise<Record<string, unknown> | null> {
  const line = await server.handleLine(JSON.stringify(message));
  return line === null ? null : (JSON.parse(line) as Record<string, unknown>);
}

describe("createMcpServer", () => {
  it("initialize にサーバー情報とプロトコルバージョンを返す", async () => {
    const res = await call(makeServer(), {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26" },
    });
    const result = res.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe("2025-03-26");
    expect(result.serverInfo).toEqual({
      name: "test-server",
      version: "0.0.1",
    });
  });

  it("通知には応答しない", async () => {
    const res = await call(makeServer(), {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    expect(res).toBeNull();
  });

  it("tools/list と tools/call が往復する", async () => {
    const server = makeServer();
    const list = await call(server, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    const tools = (list?.result as Record<string, unknown>).tools as Array<
      Record<string, unknown>
    >;
    expect(tools.map((t) => t.name)).toEqual(["echo"]);

    const called = await call(server, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "echo", arguments: { text: "hello" } },
    });
    const result = called.result as {
      content: Array<{ text: string }>;
    };
    expect(result.content[0]?.text).toBe("echo: hello");
  });

  it("無いツールと無いメソッドはエラーにする", async () => {
    const server = makeServer();
    const unknownTool = await call(server, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "nope", arguments: {} },
    });
    expect((unknownTool.error as Record<string, unknown>).code).toBe(-32602);
    const unknownMethod = await call(server, {
      jsonrpc: "2.0",
      id: 5,
      method: "resources/list",
    });
    expect((unknownMethod.error as Record<string, unknown>).code).toBe(-32601);
  });

  it("壊れた JSON はパースエラーにする", async () => {
    const server = makeServer();
    const line = await server.handleLine("{not json");
    if (line === null) throw new Error("応答が返るはずのメッセージ");
    const res = JSON.parse(line) as Record<string, unknown>;
    expect((res.error as Record<string, unknown>).code).toBe(-32700);
  });
});
