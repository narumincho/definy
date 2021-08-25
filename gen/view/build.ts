import * as fileSystem from "fs-extra";
import { View } from "./view";
import { getStaticResourceFileResult } from "./staticResource";
import { html } from "../main";
import { indexHtmlPath } from "./util";
import { viewToHtmlOption } from "./toHtml";

export type BuildOption = {
  /**
   * 見た目
   */
  readonly view: View;
  /**
   * Firebase Hosting のための ファイル出力先パス
   */
  readonly distributionPath: string;
  /**
   * staticなファイルのファイルパス
   */
  readonly staticResourcePath: string;
};

/**
 * n-view アプリ をビルドする
 */
export const build = async (option: BuildOption): Promise<void> => {
  await fileSystem.remove(option.distributionPath);

  await fileSystem.outputFile(
    indexHtmlPath(option.distributionPath),
    html.htmlOptionToString(viewToHtmlOption(option.view))
  );
  console.log("index.html のビルドに成功!");

  await Promise.all(
    (
      await getStaticResourceFileResult(option.staticResourcePath)
    ).map(async (fileResult) => {
      await fileSystem.copy(
        option.staticResourcePath + "/" + fileResult.originalFileName,
        option.distributionPath + "/" + fileResult.uploadFileName
      );
      console.log(fileResult.originalFileName, "のコピーに成功!");
    })
  );

  console.log("ビルドが完了しました");
};
