/**
 * definy MCP サーバーの入口 (docs/mcp.md)。stdio で MCP を話す。
 *
 * 環境変数:
 * - `DEFINY_SERVER_URL`: 接続先の definy サーバー (省略時 https://definy.narumincho.com)
 * - `DEFINY_ACCOUNT_SECRET_KEY` と `DEFINY_ACCOUNT_NAME`: 書き込み用の専用アカウント。
 *   両方あるときだけ書き込み系ツールが有効になる
 * - `DEFINY_PERF_TOKEN`: パフォーマンス記録 (`definy_perf_recent_submits`) の読み取りトークン。
 *   サーバー側の同名の環境変数と一致するときだけ読める
 */
import { createInterface } from "node:readline";
import { DefinyClient } from "./definy_client.ts";
import { createMcpServer } from "./protocol.ts";
import { createTools } from "./tools.ts";
import { createWriteTools, loadAccountFromEnv } from "./write_tools.ts";

const baseUrl =
  process.env.DEFINY_SERVER_URL ?? "https://definy.narumincho.com";

const client = new DefinyClient({
  baseUrl,
  perfToken: process.env.DEFINY_PERF_TOKEN,
});
const account = await loadAccountFromEnv(process.env);
const server = createMcpServer({
  tools: [
    ...createTools(client),
    ...(account === null ? [] : createWriteTools(client, account)),
  ],
  serverName: "definy-mcp",
  serverVersion: "0.2.0",
});

process.stderr.write(`definy-mcp: connected to ${baseUrl}\n`);
process.stderr.write(
  account === null
    ? "definy-mcp: read-only (set DEFINY_ACCOUNT_SECRET_KEY and DEFINY_ACCOUNT_NAME to enable writes)\n"
    : `definy-mcp: writes enabled as ${account.accountName} (${account.accountId})\n`,
);

const rl = createInterface({ input: process.stdin, terminal: false });
for await (const line of rl) {
  const response = await server.handleLine(line);
  if (response !== null) {
    process.stdout.write(`${response}\n`);
  }
}
