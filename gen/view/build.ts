import * as fileSystem from "fs-extra";
import { App } from "./app";
import { getStaticResourceFileResult } from "./staticResource";
import { html } from "../main";
import { indexHtmlPath } from "./util";
import { viewToHtmlOption } from "./toHtml";

export type BuildOption<State, Message> = {
  /**
   * 見た目
   */
  readonly app: App<State, Message>;
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
export const build = async <State, Message>(
  option: BuildOption<State, Message>
): Promise<void> => {
  await fileSystem.remove(option.distributionPath);

  await fileSystem.outputFile(
    indexHtmlPath(option.distributionPath),
    html.htmlOptionToString(
      viewToHtmlOption(option.app.stateToView(option.app.initState))
    )
  );
  console.log("index.html のビルドに成功!");

  await fileSystem.outputFile(
    option.distributionPath + "/main.js",
    `console.log("スクリプトを読み込めた!");`
  );
  console.log("script のビルドに成功!");

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
