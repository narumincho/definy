import * as d from "../../localData";
import * as fs from "fs-extra";
import * as jsTs from "../jsTs/main";
import { FileType } from "../fileType/main";
import { posix as posixPath } from "path";

/**
 * 標準ライブラリの fs の ディレクトリとファイルの区別が型レベルではない欠点の解決と,
 * ファイル操作時にログを出力したいために作った 雑なファイルシステムライブラリ
 *
 * パスの指定はすべてリポジトリのルートからの相対パスになる.
 */

/**
 * TypeScript のファイル形式. 拡張子は `ts`
 */
export const fileTypeTypeScript: FileType = "TypeScript";

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

const directoryPathAndFileNameToPathFromRepositoryRoot = (
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
  await fs.writeFile(path, data).catch((error: { readonly code: string }) => {
    if (error.code === "ENOENT") {
      console.log(`親ディレクトリが見つからなかった...?`);
      return;
    }
    throw error;
  });
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
    (error: { readonly code: string }) => {
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

/**
 * ディレクトリ内に含まれるファイルやディレクトリを削除する
 */
export const deleteFileAndDirectoryInDirectory = async (
  directoryPath: DirectoryPath
): Promise<void> => {
  const path = directoryPathToPathFromRepositoryRoot(directoryPath);
  console.log(`${path} をリセット中...`);
  await fs.remove(directoryPathToPathFromRepositoryRoot(directoryPath));
  await fs.mkdir(path);
  console.log(`${path} をリセット完了!`);
};

/**
 * ファイルの中身を読む
 * @returns ファイルの中身のバイナリ
 */
export const readFile = async (
  directoryPathAndFileName: DirectoryPathAndFileName
): Promise<Uint8Array> => {
  const path = directoryPathAndFileNameToPathFromRepositoryRoot(
    directoryPathAndFileName
  );
  console.log(`${path} を読み取り中...`);
  const result = await fs.readFile(path);
  console.log(`${path} を読み取り完了!`);
  return result;
};

/**
 * ディレクトリ内に含まれるファイルのパスを取得する.
 * 再帰的には調べず, ディレクトリ内のディレクトリは無視する.
 * @returns ディレクトリの中に入っていたファイルのパス
 */
export const readFilePathInDirectory = async (
  directoryPath: DirectoryPath
): Promise<ReadonlyArray<DirectoryPathAndFileName>> => {
  const path = directoryPathToPathFromRepositoryRoot(directoryPath);
  console.log(`${path} 内のファイルを取得中...`);
  const direntList = await fs.readdir(
    directoryPathToPathFromRepositoryRoot(directoryPath),
    { withFileTypes: true }
  );
  const result = direntList.flatMap(
    (dirent): readonly [DirectoryPathAndFileName] | [] => {
      if (!dirent.isFile()) {
        return [];
      }
      const parsedPath = posixPath.parse(dirent.name);
      const fileType = extensionToFileType(parsedPath.ext.slice(1));
      if (fileType === undefined) {
        console.warn(
          `[fileSystem] readFilePathInDirectory で 拡張子 ${parsedPath.ext} は対応していない`
        );
        return [];
      }
      return [
        {
          directoryPath,
          fileName: { name: parsedPath.name, fileType },
        },
      ];
    }
  );
  console.log(`${path} 内のファイルを取得完了!`);
  return result;
};
