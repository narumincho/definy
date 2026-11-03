/**
 * definy MCP サーバーの入口 (docs/mcp.md)。stdio で MCP を話す。
 *
 * 環境変数:
 * - `DEFINY_SERVER_URL`: 接続先の definy サーバー (省略時 https://definy.narumincho.com)
 */
import { createInterface } from "node:readline";
import { DefinyClient } from "./definy_client.ts";
import { createMcpServer } from "./protocol.ts";
import { createTools } from "./tools.ts";

const baseUrl =
  process.env.DEFINY_SERVER_URL ?? "https://definy.narumincho.com";

const client = new DefinyClient({ baseUrl });
const server = createMcpServer({
  tools: createTools(client),
  serverName: "definy-mcp",
  serverVersion: "0.1.0",
});

process.stderr.write(`definy-mcp: connected to ${baseUrl}\n`);

const rl = createInterface({ input: process.stdin, terminal: false });
for await (const line of rl) {
  const response = await server.handleLine(line);
  if (response !== null) {
    process.stdout.write(`${response}\n`);
  }
}
