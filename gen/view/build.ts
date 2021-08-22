import * as fileSystem from "fs-extra";
import { View } from "./view";
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
  /**
   * staticなファイルのリクエストのパスとファイルパス
   */
  readonly staticResourcePathObject: { [key in string]: string };
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

  for (const [_, filePath] of Object.entries(option.staticResourcePath)) {
    // eslint-disable-next-line no-await-in-loop
    await fileSystem.copy(
      option.staticResourcePath + "/" + filePath,
      option.distributionPath + "/" + filePath
    );
    console.log(`${filePath}のコピーに成功!`);
  }
  console.log("ビルドが完了しました");
};
