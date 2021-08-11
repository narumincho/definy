import * as childProcess from "child_process";
import * as fileSystem from "fs-extra";
import { origin, portNumber } from "./origin";
import { fastify } from "fastify";
import { indexHtmlPath } from "./build";
import open from "open";
import { pathAndFilePathList } from "./resource/main";

// ナルミンチョの創作記録の開発用サーバーを起動する
const instance = fastify();
instance.get("/", (request, reply) => {
  reply.type("text/html");
  childProcess.exec(
    "npx ts-node ./narumincho-creative-record/build.ts",
    (error, stdout, stderr) => {
      console.log("再ビルド中", { stdout, stderr, error });
      console.log("ts-node の実行にはエラーが無かった");
      fileSystem.readFile(indexHtmlPath).then((indexHtml: Buffer): void => {
        reply.send(indexHtml);
      });
    }
  );
});
for (const resourcePath of pathAndFilePathList) {
  instance.get(resourcePath.path, async (request, reply): Promise<void> => {
    console.log(`${resourcePath.path} をリクエストされた`);
    reply.type("image/png");
    const resourceFile = await fileSystem.readFile(resourcePath.filePath);
    reply.send(resourceFile);
  });
}

instance.listen(portNumber);
console.log(`ナルミンチョ創作記録開発サーバー起動した! → ${origin}`);
open(origin);
