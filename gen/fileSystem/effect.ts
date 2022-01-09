import * as d from "../../localData";
import * as fs from "fs-extra";
import * as jsTs from "../jsTs/main";
import {
  FilePath,
  FilePathWithFileType,
  filePathSetFileType,
  filePathWithFileTypeToPathFromRepositoryRoot,
} from "./data";
import { fileTypeTypeScript } from "../fileType/main";

/**
 * 非推奨 PureScript 版を使うべし
 */

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
