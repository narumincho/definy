import clientBuildResult from "./browserClient.json" assert { type: "json" };
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import { jsonParse } from "../../common/typedJson.ts";
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
};

export const createHttpServer = (parameter: DefinyRpcParameter) => {
  const all = addDefinyRpcApiFunction(parameter);
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response();
    }
    const url = new URL(request.url);
    const pathList = url.pathname.slice(1).split("/");
    const paramJson = url.searchParams.get("param");
    const paramJsonParsed =
      (typeof paramJson === "string" ? jsonParse(paramJson) : null) ?? null;
    if (url.pathname === "/") {
      return new Response(clientBuildResult.indexHtmlContent, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname === clientBuildResult.iconPath) {
      return new Response(base64.toUint8Array(clientBuildResult.iconContent), {
        headers: { "content-type": "image/png" },
      });
    }
    if (url.pathname === clientBuildResult.scriptPath) {
      return new Response(clientBuildResult.scriptContent, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    }
    console.log("request!: ", pathList);
    for (const func of all) {
      if (stringArrayEqual(pathList, func.fullName)) {
        if (func.needAuthentication) {
          console.log([...request.headers.entries()]);
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
