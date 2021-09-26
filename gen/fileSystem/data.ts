import { FileType } from "../fileType/main";

/**
 * 標準ライブラリの fs の ディレクトリとファイルの区別が型レベルではない欠点の解決と,
 * ファイル操作時にログを出力したいために作った 雑なファイルシステムライブラリ
 *
 * パスの指定はすべてリポジトリのルートからの相対パスになる.
 */

/**
 * ファイル名. ファイルタイプの指定はあってもなくても良い
 * {@link fileNameFrom} を使って作成する
 */
export type FileName = {
  readonly name: string;
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
    name: fileName,
    fileType,
  };
};

/**
 * 一般的なファイル名の文字列表現に変換する `star.png` `main.js` `index.html`
 */
export const fileNameToString = (fileName: FileName): string => {
  return (
    fileName.name +
    (fileName.fileType === undefined
      ? ""
      : "." + fileTypeToExtension(fileName.fileType))
  );
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
 * 拡張子から {@link FileType} を得る
 * @param extension 拡張子 `.` は含まない
 */
export const extensionToFileType = (
  extension: string
): FileType | undefined => {
  switch (extension) {
    case "png":
      return "Png";
    case "ts":
      return "TypeScript";
    case "js":
      return "JavaScript";
    case "html":
      return "Html";
  }
};

export const fileTypeToExtension = (fileType: FileType): string => {
  switch (fileType) {
    case "Png":
      return "png";
    case "TypeScript":
      return "ts";
    case "JavaScript":
      return "js";
    case "Html":
      return "html";
  }
};

export const directoryPathAndFileNameToPathFromRepositoryRoot = (
  directoryPathAndFileName: DirectoryPathAndFileName
): string => {
  return (
    directoryPathToPathFromRepositoryRoot(
      directoryPathAndFileName.directoryPath
    ) +
    "/" +
    fileNameToString(directoryPathAndFileName.fileName)
  );
};

export const directoryPathToPathFromRepositoryRoot = (
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
    fileNameToString(directoryPathAndFileName.fileName)
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
