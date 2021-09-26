import * as crypto from "crypto";
import * as fileSystem from "../fileSystem/main";
import { FileType } from "../fileType/main";

/**
 * static な ファイルの解析結果
 */
export type StaticResourceFileResult = {
  /**
   * 入力のファイル名. オリジナルのファイル名. 拡張子あり
   */
  readonly originalFileName: string;
  readonly fileId: string;
  readonly fileType: FileType | undefined;
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
  filePath: fileSystem.DirectoryPathAndFileName
): Promise<string> => {
  return crypto
    .createHash("sha256")
    .update(await fileSystem.readFile(filePath))
    .update(filePath.fileName.fileType ?? "")
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
  directoryPath: fileSystem.DirectoryPath
): Promise<ReadonlyArray<StaticResourceFileResult>> => {
  const filePathList = await fileSystem.readFilePathInDirectory(directoryPath);
  return Promise.all(
    filePathList.map(
      async (
        filePath: fileSystem.DirectoryPathAndFileName
      ): Promise<StaticResourceFileResult> => {
        const hashValue = await getFileHash(filePath);

        return {
          originalFileName: fileSystem.fileNameToString(filePath.fileName),
          fileId:
            filePath.fileName.name +
            (filePath.fileName.fileType === undefined
              ? ""
              : firstUppercase(
                  fileSystem.fileTypeToExtension(filePath.fileName.fileType)
                )),
          fileType: filePath.fileName.fileType,
          requestPath: hashValue,
          uploadFileName: hashValue,
        };
      }
    )
  );
};
