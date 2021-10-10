import * as d from "../../localData";
import * as fs from "fs-extra";
import * as jsTs from "../jsTs/main";
import {
  DirectoryPath,
  FilePath,
  FilePathWithFileType,
  directoryPathFrom,
  directoryPathToPathFromRepositoryRoot,
  extensionToFileType,
  filePathSetFileType,
  filePathWithFileTypeToPathFromRepositoryRoot,
} from "./data";
import { fileTypeTypeScript } from "../fileType/main";
import { posix as posixPath } from "path";

/**
 * バイナリデータをファイルシステムの指定した場所にファイルとして書く
 */
export const writeFile = async (
  filePathWithFileType: FilePathWithFileType,
  data: Uint8Array
): Promise<void> => {
  const path =
    filePathWithFileTypeToPathFromRepositoryRoot(filePathWithFileType);
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
  filePath: FilePath,
  jsTsCode: d.JsTsCode
): Promise<void> => {
  const codeAsString = jsTs.generateCodeAsString(
    jsTsCode,
    d.CodeType.TypeScript
  );

  await writeFile(
    filePathSetFileType(filePath, fileTypeTypeScript),
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
  input: FilePathWithFileType,
  output: FilePath
): Promise<void> => {
  const inputPath = filePathWithFileTypeToPathFromRepositoryRoot(input);
  const outputPath = filePathWithFileTypeToPathFromRepositoryRoot(
    filePathSetFileType(output, input.fileNameWithFileType.fileType)
  );
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
  directoryPathAndFileName: FilePathWithFileType
): Promise<Uint8Array> => {
  const path = filePathWithFileTypeToPathFromRepositoryRoot(
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
): Promise<ReadonlyArray<FilePathWithFileType>> => {
  const path = directoryPathToPathFromRepositoryRoot(directoryPath);
  console.log(`${path} 内のファイルを取得中...`);
  const direntList = await fs.readdir(
    directoryPathToPathFromRepositoryRoot(directoryPath),
    { withFileTypes: true }
  );
  const result = direntList.flatMap(
    (dirent): readonly [FilePathWithFileType] | [] => {
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
          fileNameWithFileType: { name: parsedPath.name, fileType },
        },
      ];
    }
  );
  console.log(`${path} 内のファイルを取得完了!`);
  return result;
};
