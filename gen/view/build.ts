import * as d from "../../localData";
import * as fileSystem from "../fileSystem/main";
import * as jsTs from "../jsTs/main";
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
  readonly distributionPath: fileSystem.DirectoryPath;
  /**
   * staticなファイルのファイルパス
   */
  readonly staticResourcePath: fileSystem.DirectoryPath;
};

/**
 * n-view アプリ をビルドする
 */
export const build = async <State, Message>(
  option: BuildOption<State, Message>
): Promise<void> => {
  await fileSystem.deleteFileAndDirectoryInDirectory(option.distributionPath);

  await fileSystem.writeFile(
    {
      directoryPath: option.distributionPath,
      fileName: { name: "index", fileType: "Html" },
    },
    new TextEncoder().encode(
      html.htmlOptionToString(
        viewToHtmlOption(option.app.stateToView(option.app.initState))
      )
    )
  );
  console.log("index.html のビルドに成功!");

  await fileSystem.writeFile(
    {
      directoryPath: option.distributionPath,
      fileName: { name: "main", fileType: "JavaScript" },
    },
    new TextEncoder().encode(
      jsTs.generateCodeAsString(
        {
          exportDefinitionList: [],
          statementList: [
            jsTs.consoleLog(
              d.TsExpr.StringLiteral(
                `「${
                  option.app.stateToView(option.app.initState).appName
                }」のスクリプトテスト!`
              )
            ),
          ],
        },
        d.CodeType.JavaScript
      )
    )
  );
  console.log("script のビルドに成功!");

  await Promise.all(
    (
      await getStaticResourceFileResult(option.staticResourcePath)
    ).map(async (fileResult) => {
      await fileSystem.copyFile(
        {
          directoryPath: option.staticResourcePath,
          fileName: {
            name: fileResult.originalFileName,
            fileType: undefined,
          },
        },
        {
          directoryPath: option.distributionPath,
          fileName: {
            name: fileResult.uploadFileName,
            fileType: undefined,
          },
        }
      );
      console.log(fileResult.originalFileName, "のコピーに成功!");
    })
  );

  console.log("ビルドが完了しました");
};
