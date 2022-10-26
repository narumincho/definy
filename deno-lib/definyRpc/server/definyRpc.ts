import clientBuildResult from "./browserClient.json" assert { type: "json" };
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import { jsonParse } from "../../../common/typedJson.ts";
import { AccountToken, ApiFunction } from "./apiFunction.ts";
import { addDefinyRpcApiFunction } from "./builtInFunctions.ts";

export * from "./type.ts";
export * from "./apiFunction.ts";

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
   * "/definy"
   *
   * @default "/"
   */
  readonly pathPrefix?: string | undefined;
};

export const createHttpServer = (parameter: DefinyRpcParameter) => {
  const all = addDefinyRpcApiFunction(parameter);
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response();
    }
    const url = new URL(request.url);
    const paramJson = url.searchParams.get("param");
    const paramJsonParsed =
      (typeof paramJson === "string" ? jsonParse(paramJson) : null) ?? null;
    const pathPrefix = parameter.pathPrefix ?? "/";
    if (!url.pathname.startsWith(pathPrefix)) {
      return new Response();
    }
    const pathNameRemovePrefix = url.pathname.slice(pathPrefix.length);
    const pathList = pathNameRemovePrefix.split("/");

    if (pathNameRemovePrefix === "/" || pathNameRemovePrefix === "") {
      return new Response(
        `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <link rel="icon" type="image/png" href="${
            pathPrefix + clientBuildResult.iconPath
          }" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>definy RPC</title>
          
          <style>
            * {
              box-sizing: border-box;
            }
          </style>
          <script type="module" src=${
            pathPrefix + clientBuildResult.scriptPath
          }></script>
        </head>
        <body>
          <noscript>Need JavaScript</noscript>
        </body>
      </html>
      `,
        {
          headers: { "content-type": "text/html; charset=utf-8" },
        }
      );
    }
    if (pathNameRemovePrefix === clientBuildResult.iconPath) {
      return new Response(base64.toUint8Array(clientBuildResult.iconContent), {
        headers: { "content-type": "image/png" },
      });
    }
    if (pathNameRemovePrefix === clientBuildResult.scriptPath) {
      return new Response(clientBuildResult.scriptContent, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    }
    console.log("request!: ", pathList);
    for (const func of all) {
      if (stringArrayEqual(pathList, func.fullName)) {
        if (func.needAuthentication) {
          console.log([...request.headers]);
          const authorizationValue = request.headers.get("authorization");
          console.log("authorizationValue", authorizationValue);
          if (authorizationValue === null) {
            return new Response(JSON.stringify("invalid account token"), {
              status: 401,
            });
          }
          const apiFunctionResult = await func.resolve(
            func.input.fromJson(paramJsonParsed),
            authorizationValue as AccountToken
          );
          return new Response(
            JSON.stringify(func.output.toJson(apiFunctionResult)),
            {
              headers: { "content-type": "application/json" },
            }
          );
        }
        const apiFunctionResult = await func.resolve(
          func.input.fromJson(paramJsonParsed),
          undefined
        );
        return new Response(
          JSON.stringify(func.output.toJson(apiFunctionResult)),
          {
            headers: { "content-type": "application/json" },
          }
        );
      }
    }
    return new Response(JSON.stringify("not found.."), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  };
};

const stringArrayEqual = (
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>
): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  for (const [index, aItem] of a.entries()) {
    if (aItem !== b[index]) {
      return false;
    }
  }
  return true;
};
