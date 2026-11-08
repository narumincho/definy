/**
 * 手元の definy サーバーが配る HTML の UI (`definy serve` の `--ui-port`).
 * ストアの html-ui プロジェクトの `html-ui.handle` を, そのサーバーの MCP の `definy_compile_expression` で
 * Wasm にし, 公開の definy-html と同じ Worker のランタイム (`definy.cloudflare-workers-runtime-script`) で動かす.
 * 設定 (`html-ui.config`) は呼び先をそのサーバーにし, 編集とコミットの画面を出す (docs/local-server.md)
 */
import { readFile } from "node:fs/promises";

type RuntimeWorker = {
  readonly fetch: (request: Request) => Promise<Response>;
};

type ToolResult = { readonly text: string; readonly isError: boolean };

/** html-ui の設定 (`html-ui.config`) を, ハンドラーを作る式にする */
export function htmlUiHandlerExpression(config: {
  readonly server: string;
  readonly token: string;
  readonly editable: boolean;
}): string {
  return `fn(request$0) =>
  @html-ui.handle(config: {server: ${JSON.stringify(config.server)}, token: ${JSON.stringify(config.token)}, editable: ${config.editable}}, request: $0)`;
}

/** seed の `definy.cloudflare-workers-runtime-script` (公開の Worker と同じランタイムの JS) */
async function readRuntimeScript(): Promise<string> {
  const seed = JSON.parse(
    await readFile(new URL("../seeds/definy.json", import.meta.url), "utf8"),
  ) as {
    readonly parts: ReadonlyArray<{
      readonly name: string;
      readonly expression?: { readonly "#string"?: string };
    }>;
  };
  const script = seed.parts.find(
    (part) => part.name === "cloudflare-workers-runtime-script",
  )?.expression?.["#string"];
  if (script === undefined) {
    throw new Error("definy.cloudflare-workers-runtime-script is missing");
  }
  return script;
}

const modules: Record<number, WebAssembly.Module> = {};
(globalThis as Record<string, unknown>)["__definyHtmlUiModules"] = modules;
let moduleCount = 0;

/** ランタイムの JS を, `./app.wasm` の代わりにこのモジュールを使うようにして読み込む */
async function loadRuntime(
  script: string,
  module: WebAssembly.Module,
): Promise<RuntimeWorker> {
  const index = moduleCount++;
  modules[index] = module;
  const source = script.replace(
    'import wasmModule from "./app.wasm";',
    `const wasmModule = globalThis.__definyHtmlUiModules[${index}];`,
  );
  if (source === script) {
    throw new Error("the runtime script does not import ./app.wasm");
  }
  const imported = (await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  )) as { readonly default: RuntimeWorker };
  return imported.default;
}

/**
 * 手元の definy サーバーの HTML の UI のハンドラーを作る
 * @param options.server UI が呼ぶ definy サーバー (`http://127.0.0.1:port`)
 * @param options.token そのサーバーの `/mcp` のトークン
 * @param options.callTool そのサーバーの MCP のツールを呼ぶ (コンパイルに使う)
 * @param options.readBranches そのサーバーの `GetProjectBranches` の応答のテキスト (ブランチが進んだらコンパイルし直す)
 */
export function createHtmlUiHandler(options: {
  readonly server: string;
  readonly token: string;
  readonly callTool: (name: string, args: unknown) => Promise<ToolResult>;
  readonly readBranches: () => Promise<string>;
}): (request: Request) => Promise<Response> {
  const runtimeScript = readRuntimeScript();
  let cached:
    | { readonly key: string; readonly worker: Promise<RuntimeWorker> }
    | undefined;

  const compile = async (): Promise<RuntimeWorker> => {
    const compiled = await options.callTool("definy_compile_expression", {
      expression: htmlUiHandlerExpression({
        server: options.server,
        token: options.token,
        editable: true,
      }),
      project: "html-ui",
    });
    if (compiled.isError) {
      throw new Error(compiled.text);
    }
    return await loadRuntime(
      await runtimeScript,
      new WebAssembly.Module(Buffer.from(compiled.text, "base64")),
    );
  };

  return async (request) => {
    const key = branchHeadsKey(await options.readBranches());
    if (cached === undefined || cached.key !== key) {
      const worker = compile();
      cached = { key, worker };
      // 失敗したら次のリクエストでコンパイルし直す
      worker.catch(() => {
        if (cached?.worker === worker) {
          cached = undefined;
        }
      });
    }
    let worker: RuntimeWorker;
    try {
      worker = await cached.worker;
    } catch (error) {
      return new Response(
        `Could not compile the HTML UI (the html-ui project). Pull it from the public server with the MCP tool definy_pull first.\n\n${error instanceof Error ? error.message : String(error)}`,
        {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }
    const response = await worker.fetch(request);
    // ランタイムは公開の Worker 向けに Access-Control-Allow-Origin: * を付けるが, 手元では他のオリジンに読ませない
    const headers = new Headers(response.headers);
    headers.delete("access-control-allow-origin");
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  };
}

/**
 * コンパイルし直すかを決めるキー. html-ui はそのブランチと, 他のパーツを読む各プロジェクトの main の
 * 最新のコミットで決まる (definy.collect-evaluation-parts) ので, それらのコミットのハッシュを並べる
 */
export function branchHeadsKey(branchesJson: string): string {
  const { branches } = JSON.parse(branchesJson) as {
    readonly branches?: ReadonlyArray<{
      readonly projectName: string;
      readonly branch: string;
      readonly latestEvent?: { readonly eventHash: string };
    }>;
  };
  return (branches ?? [])
    .filter((branch) => branch.branch === "main")
    .map(
      (branch) =>
        `${branch.projectName}/${branch.branch}/${branch.latestEvent?.eventHash ?? ""}`,
    )
    .sort()
    .join("\n");
}
