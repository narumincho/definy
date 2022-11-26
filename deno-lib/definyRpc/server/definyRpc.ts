import clientBuildResult from "./browserClient.json" assert { type: "json" };
import { structuredJsonParse, StructuredJsonValue } from "../../typedJson.ts";
import { AccountToken, FunctionAndTypeList } from "../core/apiFunction.ts";
import { addDefinyRpcApiFunction } from "../core/builtInFunctions.ts";
import { SimpleRequest } from "../../simpleRequestResponse/simpleRequest.ts";
import {
  notFound,
  SimpleResponse,
  simpleResponseCache5SecJson,
  simpleResponseHtml,
  simpleResponseImmutableJavaScript,
  simpleResponseImmutablePng,
  simpleResponseOkEmpty,
  simpleResponsePrivateJson,
  unauthorized,
} from "../../simpleRequestResponse/simpleResponse.ts";
import { stringArrayEqual, stringArrayMatchPrefix } from "../../util.ts";
import { toBytes } from "https://deno.land/x/fast_base64@v0.1.7/mod.ts";

export * from "../core/type.ts";
export * from "../core/apiFunction.ts";
export * from "../core/builtInType.ts";

const editorPath = "_editor";

export type DefinyRpcParameter = {
  /**
   * サーバー名 (ルート直下の名前空間になる)
   */
  readonly name: string;
  /**
   * サーバーを構築する関数たち
   */
  readonly all: () => FunctionAndTypeList;
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

/**
 * HTTP リクエストを definyRPC なりに解釈し, HTTPレスポンス を返す
 */
export const handleRequest = async (
  parameter: DefinyRpcParameter,
  request: SimpleRequest,
): Promise<SimpleResponse | undefined> => {
  const pathPrefix = parameter.pathPrefix ?? [];
  if (!stringArrayMatchPrefix(request.url.path, pathPrefix)) {
    return undefined;
  }
  const pathListRemovePrefix = request.url.path.slice(pathPrefix.length);

  const all = addDefinyRpcApiFunction(parameter);
  if (request.method === "OPTIONS") {
    return simpleResponseOkEmpty;
  }

  const paramJson = request.url.query.get("param");
  const paramJsonParsed: StructuredJsonValue =
    (typeof paramJson === "string"
      ? structuredJsonParse(paramJson)
      : undefined) ?? { type: "null" };

  if (stringArrayEqual(pathListRemovePrefix, [])) {
    return simpleResponseHtml(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="${
      editorPathPrefix(pathPrefix) + clientBuildResult.iconHash
    }" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${parameter.name} | definy RPC</title>
    
    <style>
      * {
        box-sizing: border-box;
      }
    </style>
    <script type="module" src="${
      editorPathPrefix(pathPrefix) + clientBuildResult.scriptHash
    }"></script>
  </head>
  <body>
    <noscript>Need JavaScript</noscript>
  </body>
</html>
`);
  }
  if (
    stringArrayEqual(pathListRemovePrefix, [
      editorPath,
      clientBuildResult.iconHash,
    ])
  ) {
    return simpleResponseImmutablePng(
      await toBytes(clientBuildResult.iconContent),
    );
  }
  if (
    stringArrayEqual(pathListRemovePrefix, [
      editorPath,
      clientBuildResult.scriptHash,
    ])
  ) {
    return simpleResponseImmutableJavaScript(clientBuildResult.scriptContent);
  }
  console.log("request!: ", pathListRemovePrefix);
  for (const func of all.functionsList) {
    if (stringArrayEqual(pathListRemovePrefix, func.fullName)) {
      if (func.needAuthentication) {
        const authorizationHeaderValue = request.headers.authorization;
        if (authorizationHeaderValue === undefined) {
          return unauthorized("require account token in Authorization header");
        }
        if (
          authorizationHeaderValue.type !== "Bearer"
        ) {
          return unauthorized("invalid account token in Authorization header");
        }
        const apiFunctionResult = await func.resolve(
          func.input.fromStructuredJsonValue(paramJsonParsed),
          authorizationHeaderValue.credentials as AccountToken,
        );
        return simpleResponsePrivateJson(
          func.output.toStructuredJsonValue(apiFunctionResult),
        );
      }
      const apiFunctionResult = await func.resolve(
        func.input.fromStructuredJsonValue(paramJsonParsed),
        undefined,
      );
      return simpleResponseCache5SecJson(
        func.output.toStructuredJsonValue(apiFunctionResult),
      );
    }
  }
  return notFound({
    examples: all.functionsList.map((func) => func.fullName),
    specified: pathListRemovePrefix,
  });
};

const editorPathPrefix = (pathPrefix: ReadonlyArray<string>) => {
  if (pathPrefix.length === 0) {
    return "/" + editorPath + "/";
  }
  return "/" + pathPrefix.join("/") + "/" + editorPath + "/";
};
