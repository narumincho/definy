import * as crypto from "crypto";
import * as fileSystem from "fs-extra";
import { extensionToMimeType } from "../fileSystem/main";
import { posix as path } from "path";

/**
 * static な ファイルの解析結果
 */
export type StaticResourceFileResult = {
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
