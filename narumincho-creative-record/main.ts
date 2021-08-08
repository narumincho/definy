import { fastify } from "fastify";
import { html } from "../gen/main";

const instance = fastify();

instance.get("/", (request, reply) => {
  reply.type("text/html");
  reply.send(
    html.htmlOptionToString({
      appName: "ナルミンチョの創作記録",
      children: [html.div({}, "やあ")],
      coverImageUrl: new URL("https://narumincho.com/icon"),
      description:
        "革新的なプログラミング言語のDefiny, Web技術, 作っているゲームなどについて解説しています",
      iconUrl: new URL("https://narumincho.com/icon"),
      language: "Japanese",
      pageName: "ナルミンチョの創作記録",
      scriptUrlList: [],
      styleUrlList: [],
      twitterCard: "SummaryCard",
      url: new URL("http://localhost:8080"),
      themeColor: undefined,
    })
  );
});

instance.listen(8080);
console.log("http://localhost:8080");
export {};
