import {
  HtmlOption,
  colorToHexString,
  div,
  htmlOptionToString,
} from "../gen/html/main";

describe("toString", () => {
  const sampleHtml: HtmlOption = {
    appName: "テストアプリ",
    pageName: "テストページ",
    language: "Japanese",
    iconUrl: new URL("https://narumincho.com/assets/kamausagi.png"),
    coverImageUrl: new URL("https://narumincho.com/assets/kamausagi.png"),
    description: "ページの説明",
    twitterCard: "SummaryCard",
    url: new URL("https://narumincho.com"),
    scriptUrlList: [],
    styleUrlList: [],
    children: [div({}, "それな")],
    themeColor: undefined,
  };
  const htmlAsString: string = htmlOptionToString(sampleHtml);
  console.log(htmlAsString);
  it("include doctype html", () => {
    expect(htmlAsString).toMatchInlineSnapshot(
      `"<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>テストページ</title><meta name="description" content="ページの説明"><link rel="icon" href="https://narumincho.com/assets/kamausagi.png"><meta name="twitter:card" content="summary"><meta property="og:url" content="https://narumincho.com/"><meta property="og:title" content="テストページ"><meta property="og:site_name" content="テストアプリ"><meta property="og:description" content="ページの説明"><meta property="og:image" content="https://narumincho.com/assets/kamausagi.png"></head><body><noscript>テストアプリ では JavaScript を使用します. ブラウザの設定で有効にしてください.</noscript><div>それな</div></body></html>"`
    );
  });
});

describe("color", () => {
  it("white", () => {
    expect(colorToHexString({ r: 1, g: 1, b: 1 })).toEqual("#ffffff");
  });
  it("black", () => {
    expect(colorToHexString({ r: 0, g: 0, b: 0 })).toEqual("#000000");
  });
  it("red", () => {
    expect(colorToHexString({ r: 1, g: 0, b: 0 })).toEqual("#ff0000");
  });
  it("medium", () => {
    expect(colorToHexString({ r: 0.5, g: 0.2, b: 0.1 })).toEqual("#803319");
  });
});
