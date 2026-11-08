/**
 * 手元の definy サーバーが配る HTML の UI (`definy serve` の `--ui-port`).
 * ストアの html-ui プロジェクトの `html-ui.handle` (`Fn(editable, request: @definy.http-request) -> @definy.service-io`) を
 * そのサーバーの MCP の `definy_compile_expression` で Wasm にし, `definy.handle-request` と同じホストの能力
 * (ストア, 手元の鍵での署名など) で動かす. html-ui はストアを直接読むので, HTTP で他のサーバーを呼ばない (docs/local-server.md)
 */

type ToolResult = { readonly text: string; readonly isError: boolean };

/** `html-ui.handle` をサーバーの処理の関数 (`Fn(request: @definy.http-request) -> @definy.service-io`) にする式 */
export function htmlUiHandlerExpression(editable: boolean): string {
  return `fn(request$0) =>
  @html-ui.handle(editable: ${editable}, request: $0)`;
}

/**
 * 手元の definy サーバーの HTML の UI のハンドラーを作る
 * @param options.callTool そのサーバーの MCP のツールを呼ぶ (コンパイルに使う)
 * @param options.readBranches そのサーバーの `GetProjectBranches` の応答のテキスト (main が進んだらコンパイルし直す)
 * @param options.run コンパイルした処理でリクエストを処理する (`handleWorkerRequest` の `service`)
 */
export function createHtmlUiHandler(options: {
  readonly callTool: (name: string, args: unknown) => Promise<ToolResult>;
  readonly readBranches: () => Promise<string>;
  readonly run: (
    request: Request,
    service: WebAssembly.Module,
  ) => Promise<Response>;
}): (request: Request) => Promise<Response> {
  let cached:
    | {
        readonly key: string;
        readonly service: Promise<WebAssembly.Module>;
      }
    | undefined;

  const compile = async (): Promise<WebAssembly.Module> => {
    const compiled = await options.callTool("definy_compile_expression", {
      expression: htmlUiHandlerExpression(true),
      project: "html-ui",
    });
    if (compiled.isError) {
      throw new Error(compiled.text);
    }
    return new WebAssembly.Module(Buffer.from(compiled.text, "base64"));
  };

  return async (request) => {
    const key = branchHeadsKey(await options.readBranches());
    if (cached === undefined || cached.key !== key) {
      const service = compile();
      cached = { key, service };
      // 失敗したら次のリクエストでコンパイルし直す
      service.catch(() => {
        if (cached?.service === service) {
          cached = undefined;
        }
      });
    }
    let service: WebAssembly.Module;
    try {
      service = await cached.service;
    } catch (error) {
      return new Response(
        `Could not compile the HTML UI (the html-ui project). Pull it from the public server with the MCP tool definy_pull first.\n\n${error instanceof Error ? error.message : String(error)}`,
        {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }
    return await options.run(request, service);
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
