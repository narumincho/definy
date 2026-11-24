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
 * 公開サーバーの写しにする処理の式 (definy-html の Cron と同じ `definy.mirror-pull`. docs/raspberry-pi.md)
 * @param remote 取り込む相手 (`https://definy.narumincho.com` など)
 */
export function mirrorPullExpression(remote: string): string {
  return `fn(request$0) =>
  @definy.mirror-pull(remote: ${JSON.stringify(remote)}, limit: 1000, content_limit: 5000)`;
}

type CompiledServiceOptions = {
  /** そのサーバーの MCP のツールを呼ぶ (コンパイルに使う) */
  readonly callTool: (name: string, args: unknown) => Promise<ToolResult>;
  /** そのサーバーの `GetProjectBranches` の応答のテキスト (main が進んだらコンパイルし直す) */
  readonly readBranches: () => Promise<string>;
  /** コンパイルした処理でリクエストを処理する (`handleWorkerRequest` の `service`) */
  readonly run: (
    request: Request,
    service: WebAssembly.Module,
  ) => Promise<Response>;
};

/**
 * 手元の definy サーバーの HTML の UI のハンドラーを作る
 * @param options.editable 編集とコミットの画面を出すか (公開するとき (`--public-host`) は false)
 */
export function createHtmlUiHandler(
  options: CompiledServiceOptions & { readonly editable?: boolean },
): (request: Request) => Promise<Response> {
  return createCompiledServiceHandler({
    ...options,
    expression: htmlUiHandlerExpression(options.editable ?? true),
    project: "html-ui",
    unavailable:
      "Could not compile the HTML UI (the html-ui project). Pull it from the public server with the MCP tool definy_pull first.",
  });
}

/**
 * ストアのパーツの式 (`Fn(request: @definy.http-request) -> @definy.service-io`) をコンパイルして, サーバーの処理として動かすハンドラーを作る.
 * コンパイルは使い回し, どれかのプロジェクトの main が進んだらコンパイルし直す
 * @param options.expression コンパイルする式
 * @param options.project 式を読むプロジェクト (そのプロジェクトの main のパーツを使う)
 * @param options.unavailable コンパイルできなかったときの 503 の説明
 */
export function createCompiledServiceHandler(
  options: CompiledServiceOptions & {
    readonly expression: string;
    readonly project: string;
    readonly unavailable: string;
  },
): (request: Request) => Promise<Response> {
  let cached:
    | {
        readonly key: string;
        readonly service: Promise<WebAssembly.Module>;
      }
    | undefined;

  const compile = async (): Promise<WebAssembly.Module> => {
    const compiled = await options.callTool("definy_compile_expression", {
      expression: options.expression,
      project: options.project,
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
        `${options.unavailable}\n\n${error instanceof Error ? error.message : String(error)}`,
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
