import { html, view } from "../gen/main";
import { origin, portNumber } from "./origin";
import { fastify } from "fastify";
import { promises as fileSystem } from "fs";
import { pathAndFilePathList } from "./resource/main";
import { topBox } from "./top";

const iconPath = "/icon";

const instance = fastify();
instance.get("/", (request, reply) => {
  reply.type("text/html");
  reply.send(
    html.htmlOptionToString(
      view.viewToHtmlOption({
        appName: "ナルミンチョの創作記録",
        box: topBox,
        coverImageUrl: new URL(origin + iconPath),
        description:
          "革新的なプログラミング言語のDefiny, Web技術, 作っているゲームなどについて解説しています",
        iconUrl: new URL(origin + iconPath),
        language: "Japanese",
        pageName: "ナルミンチョの創作記録",
        scriptUrlList: [],
        styleUrlList: [],
        url: new URL(origin),
        themeColor: undefined,
      })
    )
  );
});
for (const resourcePath of pathAndFilePathList) {
  instance.get(resourcePath.path, (request, reply): void => {
    console.log(`${resourcePath.path} をリクエストされた`);
    reply.type("image/png");
    fileSystem
      .readFile(resourcePath.filePath)
      .then((iconImageFile) => {
        reply.send(iconImageFile);
      })
      .catch((err) => {
        console.log("ファイル読み込み時にエラー", err);
      });
  });
}

instance.listen(portNumber);
console.log(`ナルミンチョ創作記録開発サーバー起動中! → ${origin}`);
