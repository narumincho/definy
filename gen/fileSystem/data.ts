import { FileType } from "../fileType/main";

/**
 * 非推奨 PureScript 版を使うべし
 */

/**
 * 標準ライブラリの fs の ディレクトリとファイルの区別が型レベルではない欠点の解決と,
 * ファイル操作時にログを出力したいために作った 雑なファイルシステムライブラリ
 *
 * パスの指定はすべてリポジトリのルートからの相対パスになる.
 */

/**
 * ファイル名. ファイルタイプの指定はあってもなくても良い
 * {@link fileNameWithFileTypeFrom} を使って作成する
 */
export type FileNameWithFileType = {
  readonly name: string;
  readonly fileType: FileType;
};

/**
 * 一般的なファイル名の文字列表現に変換する `star.png` `main.js` `index.html`
 */
export const fileNameWithFileTypeToString = (
  fileName: FileNameWithFileType
): string => {
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

export type FilePathWithFileType = {
  readonly directoryPath: DirectoryPath;
  readonly fileNameWithFileType: FileNameWithFileType;
};

export type FilePath = {
  readonly directoryPath: DirectoryPath;
  readonly fileName: string;
};

export const filePathSetFileType = (
  filePath: FilePath,
  fileType: FileType
): FilePathWithFileType => {
  return {
    directoryPath: filePath.directoryPath,
    fileNameWithFileType: {
      name: filePath.fileName,
      fileType,
    },
  };
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

export const filePathWithFileTypeToPathFromRepositoryRoot = (
  directoryPathAndFileName: FilePathWithFileType
): string => {
  return (
    directoryPathToPathFromRepositoryRoot(
      directoryPathAndFileName.directoryPath
    ) +
    "/" +
    fileNameWithFileTypeToString(directoryPathAndFileName.fileNameWithFileType)
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
