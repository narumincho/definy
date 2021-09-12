import * as d from "../../localData";
import * as fileSystem from "fs-extra";
import * as jsTs from "../jsTs/main";
import { StaticResourceFileResult } from "./staticResource";
import { localhostOrigin } from "./util";

/**
 * static なファイルを取得するための URL や
 * 実行環境に応じて変化するオリジン をコード生成する
 * @param staticList static なファイルの情報
 * @param portNumber ポート番号
 * @param outputCodeFilePath コード生成の出力先
 */
export const generateViewOutTs = async (
  staticList: ReadonlyArray<StaticResourceFileResult>,
  portNumber: number,
  outputCodeFilePath: string
): Promise<void> => {
  const code: d.JsTsCode = {
    exportDefinitionList: [
      d.ExportDefinition.Variable({
        name: jsTs.identifierFromString("origin"),
        document: "オリジン (ビルド時にコード生成される)",
        type: d.TsType.String,
        expr: d.TsExpr.StringLiteral(localhostOrigin(portNumber)),
      }),
      d.ExportDefinition.Variable({
        name: jsTs.identifierFromString("staticResourceUrl"),
        document: "クライアントでファイルを取得するのに使うURL",
        type: d.TsType.Object(
          staticList.map((result) => ({
            name: result.fileId,
            type: d.TsType.ScopeInGlobal(jsTs.identifierFromString("URL")),
            document:
              'static な ファイル の "' +
              result.originalFileName +
              '"をリクエストするためのURL. ファイルのハッシュ値は "' +
              result.uploadFileName +
              '"',
            required: true,
          }))
        ),
        expr: d.TsExpr.ObjectLiteral(
          staticList.map((result) =>
            d.TsMember.KeyValue({
              key: result.fileId,
              value: d.TsExpr.New({
                expr: d.TsExpr.GlobalObjects(jsTs.identifierFromString("URL")),
                parameterList: [
                  d.TsExpr.StringLiteral(
                    localhostOrigin(portNumber) + "/" + result.uploadFileName
                  ),
                ],
              }),
            })
          )
        ),
      }),
    ],
    statementList: [],
  };
  await fileSystem.writeFile(
    outputCodeFilePath,
    jsTs.generateCodeAsString(code, d.CodeType.TypeScript)
  );
};
