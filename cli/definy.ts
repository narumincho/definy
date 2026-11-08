/**
 * definy のコマンド. `node cli/definy.ts serve [--port 8787] [--ui-port 8788] [--data-dir ~/.definy]` で手元の definy サーバーを起動する
 * (docs/local-server.md)
 */
import { registerHooks } from "node:module";
import { parseArgs } from "node:util";

// Cloudflare Workers と同じく `*.wasm?module` を `WebAssembly.Module` として読み込む (vitest.config.ts と同じ).
// フックは読み込む前に登録しないといけないので, サーバーの処理は後から動的に import する
registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(".wasm?module")) {
      return nextLoad(url, context);
    }
    const file = new URL(url);
    file.search = "";
    return {
      format: "module",
      shortCircuit: true,
      source: `import { readFileSync } from "node:fs";
export default new WebAssembly.Module(readFileSync(new URL(${JSON.stringify(file.href)})));`,
    };
  },
});

const usage = `usage: definy serve [--port <port>] [--ui-port <port|off>] [--data-dir <dir>] [--account-name <name>]

  serve   Start the local definy server (HTTP MCP at http://127.0.0.1:<port>/mcp,
          the HTML UI of the html-ui project at http://127.0.0.1:<ui-port>)`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string", default: "8787" },
    "ui-port": { type: "string", default: "8788" },
    "data-dir": { type: "string" },
    "account-name": { type: "string", default: "local" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || positionals[0] !== "serve") {
  console.log(usage);
  process.exit(values.help ? 0 : 1);
}

const { defaultDataDir, startLocalServer } = await import("./serve.ts");
const dataDir = values["data-dir"] ?? defaultDataDir();
const server = await startLocalServer({
  dataDir,
  port: Number(values.port),
  ...(values["ui-port"] === "off" ? {} : { uiPort: Number(values["ui-port"]) }),
  accountName: values["account-name"],
});
console.log(`definy server: ${server.origin}${server.uiOrigin === undefined ? "" : `\nHTML UI: ${server.uiOrigin} (the html-ui project. Run definy_pull first if this server does not have it)`}
data: ${dataDir}
account: ${server.account.accountName} (${server.account.accountId})

Add it to Claude Code:
  claude mcp add --transport http definy-local ${server.origin}/mcp --header "Authorization: Bearer ${server.token}"`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
