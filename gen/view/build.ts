import * as d from "../../localData";
import * as esbuild from "esbuild";
import * as jsTs from "../jsTs/main";
import {
  DirectoryPath,
  FilePathWithFileType,
  directoryPathToPathFromRepositoryRoot,
  filePathWithFileTypeToPathFromRepositoryRoot,
} from "../fileSystem/data";
import {
  copyFile,
  deleteFileAndDirectoryInDirectory,
  writeFile,
} from "../fileSystem/effect";
import { App } from "./app";
import { getStaticResourceFileResult } from "./staticResource";
import { html } from "../main";
import { viewToHtmlOption } from "./toHtml";

export type BuildOption<State, Message> = {
  /**
   * 見た目
   */
  readonly app: App<State, Message>;
  /**
   * Firebase Hosting のための ファイル出力先パス
   */
  readonly distributionPath: DirectoryPath;
  /**
   * staticなファイルのファイルパス
   */
  readonly staticResourcePath: DirectoryPath;
  /**
   * app が書かれた TypeScript のファイルパス
   */
  readonly clientScriptPath: FilePathWithFileType;
};

/**
 * n-view アプリ をビルドする
 */
export const build = async <State, Message>(
  option: BuildOption<State, Message>
): Promise<void> => {
  await deleteFileAndDirectoryInDirectory(option.distributionPath);

  await writeFile(
    {
      directoryPath: option.distributionPath,
      fileNameWithFileType: { name: "index", fileType: "Html" },
    },
    new TextEncoder().encode(
      html.htmlOptionToString(
        viewToHtmlOption(
          option.app.stateToView(option.app.initState),
          option.clientScriptPath.fileNameWithFileType
        )
      )
    )
  );
  console.log("index.html のビルドに成功!");

  await esbuild.build({
    entryPoints: [
      filePathWithFileTypeToPathFromRepositoryRoot(option.clientScriptPath),
    ],
    bundle: true,
    outdir: directoryPathToPathFromRepositoryRoot(option.distributionPath),
    sourcemap: true,
    minify: true,
    target: ["chrome95", "firefox94", "safari14"],
  });
  console.log("script のビルドに成功!");

  await Promise.all(
    (
      await getStaticResourceFileResult(option.staticResourcePath)
    ).map(async (fileResult) => {
      await copyFile(
        {
          directoryPath: option.staticResourcePath,
          fileNameWithFileType: fileResult.originalFileName,
        },
        {
          directoryPath: option.distributionPath,
          fileName: fileResult.uploadFileName,
        }
      );
      console.log(fileResult.originalFileName, "のコピーに成功!");
    })
  );

  console.log("ビルドが完了しました");
};
