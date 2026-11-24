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
                    [--public-host <host>]... [--mirror <url>] [--mirror-interval <seconds>]

  serve   Start the local definy server (HTTP MCP at http://127.0.0.1:<port>/mcp,
          the HTML UI of the html-ui project at http://127.0.0.1:<ui-port>)

  --public-host <host>        Serve the HTML UI read-only (GET and HEAD only, no editing) and accept
                              this Host, for a Cloudflare Tunnel (docs/raspberry-pi.md). Repeatable
  --mirror <url>              Copy the events of this public server with definy.mirror-pull
  --mirror-interval <seconds> Seconds between the copies (default 60)`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string", default: "8787" },
    "ui-port": { type: "string", default: "8788" },
    "data-dir": { type: "string" },
    "account-name": { type: "string", default: "local" },
    "public-host": { type: "string", multiple: true },
    mirror: { type: "string" },
    "mirror-interval": { type: "string", default: "60" },
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
  ...(values["public-host"] === undefined
    ? {}
    : { publicHosts: values["public-host"] }),
  ...(values.mirror === undefined
    ? {}
    : {
        mirrorRemote: values.mirror.replace(/\/+$/, ""),
        mirrorIntervalMs: Number(values["mirror-interval"]) * 1000,
      }),
  log: (message) => console.log(`${new Date().toISOString()} ${message}`),
});
console.log(`definy server: ${server.origin}${server.uiOrigin === undefined ? "" : `\nHTML UI: ${server.uiOrigin} (the html-ui project. Run definy_pull first if this server does not have it)`}
${values["public-host"] === undefined ? "" : `public (read-only) hosts: ${values["public-host"].join(", ")}\n`}${values.mirror === undefined ? "" : `mirror: ${values.mirror} every ${values["mirror-interval"]} seconds\n`}data: ${dataDir}
account: ${server.account.accountName} (${server.account.accountId})

Add it to Claude Code:
  claude mcp add --transport http definy-local ${server.origin}/mcp --header "Authorization: Bearer ${server.token}"`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
