import clientBuildResult from "./browserClient.json" assert { type: "json" };
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import { jsonParse } from "../../typedJson.ts";
import { AccountToken, ApiFunction } from "./apiFunction.ts";
import { addDefinyRpcApiFunction } from "./builtInFunctions.ts";
import { SimpleRequest } from "./simpleRequest.ts";
import { SimpleResponse } from "./simpleResponse.ts";
import { stringArrayEqual, stringArrayMatchPrefix } from "../../util.ts";

export * from "./type.ts";
export * from "./apiFunction.ts";
export * from "./simpleRequest.ts";
export * from "./simpleResponse.ts";

export type DefinyRpcParameter = {
  /**
   * サーバー名 (ルート直下の名前空間になる)
   */
  readonly name: string;
  /**
   * サーバーを構築する関数たち
   */
  readonly all: () => ReadonlyArray<ApiFunction>;
  /**
   * 生成するコードの リクエスト先オリジンのデフォルト値
   */
  readonly originHint: string;
  /**
   * 実行環境とコードを編集している環境が同じ場合に, コードを生成ボタンを押したら生成できる機能
   *
   * 本番サーバーでは `undefined` を指定する
   */
  readonly codeGenOutputFolderPath: string | undefined;
  /**
   * 処理するパス
   *
   * 同一のオリジンで他の処理をしたいときに使う
   * @example
   * ["definy"] // /definy
   * ["a", "b"] // /a/b
   *
   * @default []
   */
  readonly pathPrefix?: ReadonlyArray<string>;
};

export const handleRequest = (
  parameter: DefinyRpcParameter,
  request: SimpleRequest
): SimpleResponse | undefined => {
  const pathPrefix = parameter.pathPrefix ?? [];
  if (!stringArrayMatchPrefix(request.path, pathPrefix)) {
    return undefined;
  }
  const pathListRemovePrefix = request.path.slice(pathPrefix.length);

  const all = addDefinyRpcApiFunction(parameter);
  if (request.method === "OPTIONS") {
    return {
      status: 200,
      headers: { ContentType: undefined },
      body: undefined,
    };
  }

  const paramJson = request.query.get("param");
  const paramJsonParsed =
    (typeof paramJson === "string" ? jsonParse(paramJson) : null) ?? null;

  if (stringArrayEqual(pathListRemovePrefix, [])) {
    return {
      status: 200,
      headers: {
        ContentType: "text/html; charset=utf-8",
      },
      body: () =>
        Promise.resolve(
          new TextEncoder().encode(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/${
      pathPrefix.join("/") + clientBuildResult.iconPath
    }" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${parameter.name} | definy RPC</title>
    
    <style>
      * {
        box-sizing: border-box;
      }
    </style>
    <script type="module" src="/${
      pathPrefix.join("/") + clientBuildResult.scriptPath
    }"></script>
  </head>
  <body>
    <noscript>Need JavaScript</noscript>
  </body>
</html>
`)
        ),
    };
  }
  if (
    stringArrayEqual(
      pathListRemovePrefix,
      clientBuildResult.iconPath.split("/").filter((e) => e !== "")
    )
  ) {
    return {
      status: 200,
      headers: { ContentType: "image/png" },
      body: () =>
        Promise.resolve(base64.toUint8Array(clientBuildResult.iconContent)),
    };
  }
  if (
    stringArrayEqual(
      pathListRemovePrefix,
      clientBuildResult.scriptPath.split("/").filter((e) => e !== "")
    )
  ) {
    return {
      status: 200,
      headers: { ContentType: "text/javascript; charset=utf-8" },
      body: () =>
        Promise.resolve(
          new TextEncoder().encode(
            `window.definyRpcServerPathPrefix = ${JSON.stringify(
              parameter.pathPrefix ?? []
            )};\n` + clientBuildResult.scriptContent
          )
        ),
    };
  }
  console.log("request!: ", pathListRemovePrefix);
  for (const func of all) {
    if (stringArrayEqual(pathListRemovePrefix, func.fullName)) {
      if (func.needAuthentication) {
        const authorizationValue = request.headers.Authorization;
        console.log("authorizationValue", authorizationValue);
        if (authorizationValue === null) {
          return {
            status: 401,
            headers: {
              ContentType: "application/json",
            },
            body: () =>
              Promise.resolve(
                new TextEncoder().encode(
                  JSON.stringify("invalid account token")
                )
              ),
          };
        }
        return {
          status: 200,
          headers: {
            ContentType: "application/json",
          },
          body: async () => {
            const apiFunctionResult = await func.resolve(
              func.input.fromJson(paramJsonParsed),
              authorizationValue as AccountToken
            );
            return new TextEncoder().encode(
              JSON.stringify(func.output.toJson(apiFunctionResult))
            );
          },
        };
      }
      return {
        status: 200,
        headers: {
          ContentType: "application/json",
        },
        body: async () => {
          const apiFunctionResult = await func.resolve(
            func.input.fromJson(paramJsonParsed),
            undefined
          );
          return new TextEncoder().encode(
            JSON.stringify(func.output.toJson(apiFunctionResult))
          );
        },
      };
    }
  }
  return {
    status: 404,
    headers: {
      ContentType: "application/json",
    },
    body: () =>
      Promise.resolve(
        new TextEncoder().encode(
          JSON.stringify({
            message: "not found...",
            functionFullName: pathListRemovePrefix,
          })
        )
      ),
  };
};
