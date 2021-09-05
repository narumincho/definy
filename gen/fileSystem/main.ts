import * as d from "../../localData";
import * as fs from "fs-extra";
import * as jsTs from "../jsTs/main";
import { MimeType, imagePng } from "../mimeType/main";

/**
 * 標準ライブラリの fs の ディレクトリとファイルの区別が型レベルではない欠点の解決と,
 * ファイル操作時にログを出力したいために作った 雑なファイルシステムライブラリ
 *
 * パスの指定はすべてリポジトリのルートからの相対パスになる.
 */

/**
 * definy, ナルミンチョの創作記録で扱うファイルの種類
 */
export type FileType = MimeType | "TypeScript";

/**
 * TypeScript のファイル形式. 拡張子は `ts`
 */
export const fileTypeTypeScript: FileType = "TypeScript";

/**
 * ファイル名. ファイルタイプの指定はあってもなくても良い
 * {@link fileNameFrom} を使って作成する
 */
export type FileName = {
  readonly fileName: string;
  readonly fileType: FileType | undefined;
};

/**
 * ファイル名を作成する
 */
export const fileNameFrom = (
  fileName: string,
  fileType: FileType
): FileName => {
  if (fileName.includes("/") || fileName.includes("\\")) {
    throw new Error(
      "ファイル名に / や \\ を含めることはできません fileName=" + fileName
    );
  }
  return {
    fileName,
    fileType,
  };
};

/**
 * definy のリポジトリのルートを基準としたディレクトリの相対パス
 * {@link directoryPathFrom} を使って作成する
 */
export type DirectoryPath = {
  readonly directoryNameList: ReadonlyArray<string>;
};

/**
 * {@link DirectoryPath} を作成する
 */
export const directoryPathFrom = (
  directoryNameList: ReadonlyArray<string>
): DirectoryPath => {
  if (
    directoryNameList.some(
      (directoryName) =>
        directoryName.includes("/") || directoryName.includes("\\")
    )
  ) {
    throw new Error(
      "パスに / や \\ を含めることはできません pathList = [" +
        directoryNameList.join(",") +
        "]"
    );
  }
  return {
    directoryNameList,
  };
};

export type DirectoryPathAndFileName = {
  readonly directoryPath: DirectoryPath;
  readonly fileName: FileName;
};

/**
 * ディレクトリをめぐるためのディレクトリパスを生成する
 * @example
 * directoryPathToCreateDirectoryList(directoryPathFrom(["a", "b", "c"]));
 * // ↓
 * [
 *   { directoryNameList: ["a"] },
 *   { directoryNameList: ["a", "b"] },
 *   { directoryNameList: ["a", "b", "c"] },
 * ];
 */
const directoryPathToCreateDirectoryList = (
  directoryPath: DirectoryPath
): ReadonlyArray<DirectoryPath> => {
  return Array.from(
    { length: directoryPath.directoryNameList.length },
    (_, index): DirectoryPath => ({
      directoryNameList: directoryPath.directoryNameList.slice(0, index + 1),
    })
  );
};

/**
 * 拡張子から {@link MimeType} を得る
 */
export const extensionToMimeType = (
  extension: string
): MimeType | undefined => {
  switch (extension) {
    case "png":
      return imagePng;
  }
};

const fileTypeToExtension = (fileType: FileType): string => {
  switch (fileType) {
    case "TypeScript":
      return "ts";
    case "image/png":
      return "png";
  }
};

const directoryPathAndFileNameToPathFromRepositoryRoot = (
  directoryPathAndFileName: DirectoryPathAndFileName
): string => {
  return (
    directoryPathToPathFromRepositoryRoot(
      directoryPathAndFileName.directoryPath
    ) +
    "/" +
    directoryPathAndFileName.fileName.fileName +
    (directoryPathAndFileName.fileName.fileType === undefined
      ? ""
      : "." + fileTypeToExtension(directoryPathAndFileName.fileName.fileType))
  );
};

const directoryPathToPathFromRepositoryRoot = (
  directoryPath: DirectoryPath
): string => {
  if (directoryPath.directoryNameList.length === 0) {
    return ".";
  }
  return "./" + directoryPath.directoryNameList.join("/");
};

export const directoryPathAndFileNameToPathFromDistribution = (
  directoryPathAndFileName: DirectoryPathAndFileName
): string => {
  return (
    directoryPathToPathFromDistribution(
      directoryPathAndFileName.directoryPath
    ) +
    "/" +
    directoryPathAndFileName.fileName.fileName +
    (directoryPathAndFileName.fileName.fileType === undefined
      ? ""
      : "." + fileTypeToExtension(directoryPathAndFileName.fileName.fileType))
  );
};

export const directoryPathToPathFromDistribution = (
  directoryPath: DirectoryPath
): string => {
  if (directoryPath.directoryNameList.length === 0) {
    return "..";
  }
  return "../" + directoryPath.directoryNameList.join("/");
};

/**
 * バイナリデータをファイルシステムの指定した場所にファイルとして書く
 */
export const writeFile = async (
  directoryPathAndFileName: DirectoryPathAndFileName,
  data: Uint8Array
): Promise<void> => {
  const path = directoryPathAndFileNameToPathFromRepositoryRoot(
    directoryPathAndFileName
  );
  console.log(path, "にファイルを書き込み中...");
  await fs.writeFile(path, data);
  console.log(path, "にファイルを書き込み完了!");
};

/**
 * TypeScript のコードをファイルに書き込む
 */
export const writeTypeScriptCode = async (
  directoryPathAndFileName: DirectoryPathAndFileName,
  jsTsCode: d.JsTsCode
): Promise<void> => {
  const codeAsString = jsTs.generateCodeAsString(
    jsTsCode,
    d.CodeType.TypeScript
  );

  await writeFile(
    directoryPathAndFileName,
    new TextEncoder().encode(codeAsString)
  );
};

/**
 * definy のリポジトリで使う. 一時的に保存しておくファイルを保管しておくディレクトリ
 */
export const distributionPathAsDirectoryPath = directoryPathFrom([
  "distribution",
]);

/**
 * distribution ディレクトリを削除する. 中身のファイルやディレクトリも消す
 */
export const resetDistributionDirectory = async (): Promise<void> => {
  const path = directoryPathToPathFromRepositoryRoot(
    distributionPathAsDirectoryPath
  );
  console.log(`distribution をリセット中...`);
  await fs.remove(path).then(
    () => {},
    (error: { code: string }) => {
      if (error.code === "ENOENT") {
        console.log(`distribution を削除しようとしたが存在しなかった`);
        return;
      }
      throw error;
    }
  );
  await fs.mkdir(path);
  console.log(`distribution をリセット完了!`);
};

/**
 * ファイルをコピーする
 */
export const copyFile = (
  input: DirectoryPathAndFileName,
  output: DirectoryPathAndFileName
): Promise<void> => {
  const inputPath = directoryPathAndFileNameToPathFromRepositoryRoot(input);
  const outputPath = directoryPathAndFileNameToPathFromRepositoryRoot(output);
  console.log(`${inputPath} → ${outputPath} ファイルをコピー中...`);
  return fs.copyFile(inputPath, outputPath).then(
    () => {
      console.log(`${inputPath} → ${outputPath} ファイルをコピー完了!`);
    },
    (error: { code: string }) => {
      if (error.code === "ENOENT") {
        console.log(
          "ファイルが存在しなかった (入力と出力のどっちが存在するか区別することはできない?)"
        );
        console.log(error);
        return;
      }
      throw error;
    }
  );
};
