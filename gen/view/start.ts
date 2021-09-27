import * as childProcess from "child_process";
import * as chokidar from "chokidar";
import {
  DirectoryPath,
  FileName,
  directoryPathAndFileNameToPathFromDistribution,
  directoryPathToPathFromRepositoryRoot,
  fileNameToString,
} from "../fileSystem/data";
import { FileType, fileTypeToMimeType } from "../fileType/main";
import { fastify } from "fastify";
import { generateViewOutTs } from "./codeGen";
import { getStaticResourceFileResult } from "./staticResource";
import { localhostOrigin } from "./util";
import open from "open";
import { readFile } from "../fileSystem/effect";

export type StartDevelopmentServerOption = {
  /**
   * ビルドスクリプトのパス
   */
  readonly buildScriptPath: string;
  readonly portNumber: number;
  /**
   * Firebase Hosting のための ファイル出力先パス
   */
  readonly distributionPath: DirectoryPath;
  /**
   * static なファイルを保管しているディレクトリのパス
   */
  readonly resourceDirectoryPath: DirectoryPath;
  /**
   * static なファイルをリクエストするためのURLがコード生成されるTypeScriptのコードのファイル
   */
  readonly viewOutCodePath: string;
  /**
   * クライアントスクリプトのファイル名
   */
  readonly clientScriptFileName: FileName;
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
        directoryPathToPathFromRepositoryRoot(option.distributionPath) + "/**",
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
      reply.type(fileTypeToMimeType("Html"));
      readFile({
        directoryPath: option.distributionPath,
        fileName: { name: "index", fileType: "Html" },
      }).then((indexHtml): void => {
        reply.send(indexHtml);
      });
      return;
    }
    const clientScriptRequestPath =
      "/" +
      fileNameToString({
        name: option.clientScriptFileName.name,
        fileType: "JavaScript",
      });
    if (requestPath === clientScriptRequestPath) {
      reply.type(fileTypeToMimeType("JavaScript"));
      readFile({
        directoryPath: option.distributionPath,
        fileName: {
          name: option.clientScriptFileName.name,
          fileType: "JavaScript",
        },
      }).then((mainJs) => {
        reply.send(mainJs);
      });
      return;
    }
    if (requestPath === clientScriptRequestPath + ".map") {
      reply.type(fileTypeToMimeType("JavaScript"));
      readFile({
        directoryPath: option.distributionPath,
        fileName: {
          name: option.clientScriptFileName.name + ".map",
          fileType: "JavaScript",
        },
      }).then((mainJs) => {
        reply.send(mainJs);
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
    reply.type(fileTypeToMimeType(fileNameAndMimeType.fileType));
    readFile({
      directoryPath: option.distributionPath,
      fileName: {
        name: fileNameAndMimeType.name,
        fileType: undefined,
      },
    }).then((file) => {
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
): Promise<ReadonlyMap<string, FileName>> => {
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
          new Map<string, FileName>(
            list.map<[string, FileName]>((staticFileData) => [
              staticFileData.requestPath,
              {
                name: staticFileData.uploadFileName,
                fileType: staticFileData.fileType,
              },
            ])
          )
        );
      }
    );
  });
};
