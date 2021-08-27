import * as crypto from "crypto";
import * as d from "../../localData";
import * as fileSystem from "fs-extra";
import * as jsTs from "../jsTs/main";
import { extensionToMimeType } from "../fileSystem/main";
import { localhostOrigin } from "./util";
import { posix as path } from "path";

/**
 * static な ファイルの解析結果
 */
type StaticResourceFileResult = {
  /**
   * 入力のファイル名. オリジナルのファイル名. 拡張子あり
   */
  readonly originalFileName: string;
  readonly fileId: string;
  readonly mimeType: string;
  readonly requestPath: string;
  /**
   * Firebase Hosting などにアップロードするファイル名. 拡張子は含まれない
   */
  readonly uploadFileName: string;
};

export type FilePathAndMimeType = {
  readonly fileName: string;
  readonly mimeType: string;
};

export const generateStaticResourceUrlCode = async (
  portNumber: number,
  directoryPath: string,
  outputCodeFilePath: string
): Promise<ReadonlyMap<string, FilePathAndMimeType>> => {
  const resultList = await getStaticResourceFileResult(directoryPath);

  const code: d.JsTsCode = {
    exportDefinitionList: [
      d.ExportDefinition.Variable({
        name: jsTs.identiferFromString("staticResourceUrl"),
        document: "クライアントでファイルを取得するのに使うURL",
        type: d.TsType.Object(
          resultList.map((result) => ({
            name: result.fileId,
            type: d.TsType.ScopeInGlobal(jsTs.identiferFromString("URL")),
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
          resultList.map((result) =>
            d.TsMember.KeyValue({
              key: result.fileId,
              value: d.TsExpr.New({
                expr: d.TsExpr.GlobalObjects(jsTs.identiferFromString("URL")),
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
  return new Map(
    resultList.map((result): readonly [string, FilePathAndMimeType] => [
      result.requestPath,
      { fileName: result.uploadFileName, mimeType: result.mimeType },
    ])
  );
};

/**
 * 指定したファイルパスの SHA-256 のハッシュ値を取得する
 * @param filePath ハッシュ値を取得するファイルの ファイルパス
 */
const getFileHash = async (
  filePath: string,
  mimeType: string
): Promise<string> => {
  return crypto
    .createHash("sha256")
    .update(await fileSystem.readFile(filePath))
    .update(mimeType)
    .digest("hex");
};

const firstUppercase = (text: string): string => {
  const firstChar = text[0];
  if (typeof firstChar === "string") {
    return firstChar.toUpperCase() + text.slice(1);
  }
  return "";
};

/**
 * static なファイルが入っているディレクトリを分析する
 * @param directoryPath static なディレクトリが入っているフォルダ
 */
export const getStaticResourceFileResult = async (
  directoryPath: string
): Promise<ReadonlyArray<StaticResourceFileResult>> => {
  const fileNameList = await fileSystem.readdir(directoryPath);
  return Promise.all(
    fileNameList.map(async (fileName): Promise<StaticResourceFileResult> => {
      const extension = path.parse(fileName).ext.slice(1);
      const mimeType = extensionToMimeType(extension);
      if (mimeType === undefined) {
        throw new Error("不明な拡張子です. " + extension);
      }
      const hashValue = await getFileHash(
        path.join(directoryPath, fileName),
        mimeType
      );

      return {
        originalFileName: fileName,
        fileId: path.parse(fileName).name + firstUppercase(extension),
        mimeType,
        requestPath: hashValue,
        uploadFileName: hashValue,
      };
    })
  );
};
