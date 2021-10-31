import { htmlOptionToString } from "./main";

console.log(
  htmlOptionToString({
    appName: "アプリ名だなー",
    bodyClass: "sampleClass",
    coverImagePath: ["a", "b", "c"],
    description: "説明文",
    iconPath: ["iconPath"],
    language: "English",
    origin: "https://sample.com",
    pageName: "ページ名だー",
    path: ["the", "path"],
    scriptPath: ["script"],
    style: "html { height: 100% }",
    stylePath: ["style"],
    themeColor: { r: 10, g: 20, b: 30, a: 255 },
  })
);
