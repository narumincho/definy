import * as childProcess from "child_process";
import * as fileSystem from "fs-extra";
import { indexHtmlPath, localhostOrigin } from "./util";
import { fastify } from "fastify";
import open from "open";

export type StartDevelopmentServerOption = {
  /**
   * ビルドスクリプトのパス
   */
  readonly buildScriptPath: string;
  readonly portNumber: number;
  /**
   * Firebase Hosting のための ファイル出力先パス
   */
  readonly distributionPath: string;
  /**
   * staticなファイルのリクエストのパスとファイルパス
   */
  readonly staticResourcePathObject: { [key in string]: string };
};

/**
 * n-view アプリを開発目的で起動する
 */
export const startDevelopmentServer = (
  option: StartDevelopmentServerOption
): void => {
  const instance = fastify();
  instance.get("/", (request, reply) => {
    reply.type("text/html");
    childProcess.exec(
      `npx ts-node ${option.buildScriptPath}`,
      (error, stdout, stderr) => {
        console.log("再ビルド中", { stdout, stderr, error });
        console.log("ts-node の実行にはエラーが無かった");
        fileSystem
          .readFile(indexHtmlPath(option.distributionPath))
          .then((indexHtml: Buffer): void => {
            reply.send(indexHtml);
          });
      }
    );
  });
  for (const [urlPath, filePath] of Object.entries(
    option.staticResourcePathObject
  )) {
    instance.get("/" + urlPath, async (request, reply): Promise<void> => {
      console.log(`${urlPath} をリクエストされた`);
      reply.type("image/png");
      const resourceFile = await fileSystem.readFile(
        option.distributionPath + "/" + filePath
      );
      reply.send(resourceFile);
    });
  }

  instance.listen(option.portNumber);
  const origin = localhostOrigin(option.portNumber);
  console.log(`開発サーバー起動した! → ${origin}`);
  open(origin);
};
