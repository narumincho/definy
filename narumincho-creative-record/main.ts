import { fastify } from "fastify";
import { promises as fileSystem } from "fs";
import { html } from "../gen/main";
import { topChildren } from "./top";

const portNumber = 8080;
const origin = `http://localhost:${portNumber}`;
const iconPath = "/icon";

const instance = fastify();
instance.get("/", (request, reply) => {
  reply.type("text/html");
  reply.send(
    html.htmlOptionToString({
      appName: "ナルミンチョの創作記録",
      children: topChildren,
      coverImageUrl: new URL(origin + iconPath),
      description:
        "革新的なプログラミング言語のDefiny, Web技術, 作っているゲームなどについて解説しています",
      iconUrl: new URL(origin + iconPath),
      language: "Japanese",
      pageName: "ナルミンチョの創作記録",
      scriptUrlList: [],
      styleUrlList: [],
      twitterCard: "SummaryCard",
      url: new URL(origin),
      themeColor: undefined,
      isBackgroundColorBlack: true,
    })
  );
});
instance.get(iconPath, (request, reply): void => {
  console.log("アイコンをリクエストされた");
  reply.type("image/png");
  fileSystem
    .readFile("./narumincho-creative-record/icon.png")
    .then((iconImageFile) => {
      reply.send(iconImageFile);
    })
    .catch((err) => {
      console.log("アイコンファイル読み込み時にエラー", err);
    });
});

instance.listen(portNumber);
console.log(`ナルミンチョ創作記録開発サーバー起動中! → ${origin}`);

export {};
