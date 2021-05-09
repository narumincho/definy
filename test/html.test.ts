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
    expect(htmlAsString).toMatchSnapshot();
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
