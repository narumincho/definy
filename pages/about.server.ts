import { defineHead } from "void";
import { label } from "../src/language.ts";
import { requestLanguage } from "../src/page_head.ts";
import { pageTitle } from "../src/page_title.ts";

/**
 * /about の head. 上に紹介スライドがあるので, SNS に貼ったときは紹介スライドの表紙の画像 (OGP) を出す.
 * 画像は scripts/capture_story_ogp.ts で作る (docs/story.md)
 */
export const head = defineHead((c) => {
  const language = requestLanguage(c);
  const title = pageTitle(label(language, "About", "About", "Pri"));
  const description = label(
    language,
    "definy is a simple, purely functional visual programming language with no syntax errors. A 5-minute slide tour of its history and plans.",
    "definy は構文エラーのない、シンプルな純粋関数型のビジュアルプログラミング言語。その歴史とこれからの計画を 5 分のスライドで紹介します。",
    "definy estas simpla, pure funkcia vida programlingvo sen sintaksaj eraroj. 5-minuta lumbilda prezento pri ĝia historio kaj planoj.",
  );
  const url = new URL(c.req.url);
  // og:image は絶対 URL でないと読まない SNS がある
  const image = `${url.origin}/story/ogp-${language}.png`;
  return {
    title,
    meta: [
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${url.origin}/about?lang=${language}` },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "675" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: image },
    ],
  };
});
