import * as childProcess from "child_process";
import * as chokidar from "chokidar";
import * as fileSystem from "fs-extra";
import { indexHtmlPath, localhostOrigin } from "./util";
import { fastify } from "fastify";
import { generateViewOutTs } from "./codeGen";
import { getStaticResourceFileResult } from "./staticResource";
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
   * static なファイルを保管しているディレクトリのパス
   */
  readonly resourceDirectoryPath: string;
  /**
   * static なファイルをリクエストするためのURLがコード生成されるTypeScriptのコードのファイル
   */
  readonly viewOutCodePath: string;
};

type FilePathAndMimeType = {
  readonly fileName: string;
  readonly mimeType: string;
};

/**
 * n-view アプリを開発目的で起動する
 */
export const startDevelopmentServer = async (
  option: StartDevelopmentServerOption
): Promise<void> => {
  console.log("first build start");
  let staticResourceRequestPathToFileNameMap = await runBuildScript(option);
  console.log("first build end");

  let isRunningBuildScript = false;
  chokidar
    .watch(".", {
      ignored: [
        "**/node_modules/**",
        ".git/**",
        option.distributionPath + "/**",
      ],
    })
    .on("all", (eventType, changeFilePath) => {
      console.log("change file!", eventType, changeFilePath);
      if (!isRunningBuildScript) {
        isRunningBuildScript = true;
        runBuildScript(option).then(
          (result) => {
            staticResourceRequestPathToFileNameMap = result;
            isRunningBuildScript = false;
          },
          () => {
            isRunningBuildScript = false;
          }
        );
      }
    });

  const instance = fastify();
  instance.get("/:path", (request, reply) => {
    const requestPath = request.url;
    console.log("requestPath", requestPath);
    if (requestPath === "/") {
      reply.type("text/html");
      fileSystem
        .readFile(indexHtmlPath(option.distributionPath))
        .then((indexHtml: Buffer): void => {
          reply.send(indexHtml);
        });
      return;
    }
    const fileNameAndMimeType = staticResourceRequestPathToFileNameMap.get(
      requestPath.slice(1)
    );
    if (fileNameAndMimeType === undefined) {
      console.log("見つからなかったので 404を返す", requestPath);
      reply.status(404);
      reply.send();
      return;
    }
    reply.type(fileNameAndMimeType.mimeType);
    fileSystem
      .readFile(option.distributionPath + "/" + fileNameAndMimeType.fileName)
      .then((file) => {
        reply.send(file);
      });
  });

  instance.listen(option.portNumber);
  const origin = localhostOrigin(option.portNumber);
  console.log(`開発サーバー起動した! → ${origin}`);
  open(origin);
};

export const runBuildScript = async (
  option: StartDevelopmentServerOption
): Promise<ReadonlyMap<string, FilePathAndMimeType>> => {
  const list = await getStaticResourceFileResult(option.resourceDirectoryPath);
  await generateViewOutTs(list, option.portNumber, option.viewOutCodePath);

  console.log("generate static resource url code done.");

  return new Promise((resolve, reject) => {
    console.log("build start");
    childProcess.exec(
      `npx ts-node ${option.buildScriptPath}`,
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }
        console.log("ビルド完了", { stdout, stderr, error });
        resolve(
          new Map<string, FilePathAndMimeType>(
            list.map<[string, FilePathAndMimeType]>((staticFileData) => [
              staticFileData.requestPath,
              {
                fileName: staticFileData.uploadFileName,
                mimeType: staticFileData.mimeType,
              },
            ])
          )
        );
      }
    );
  });
};
