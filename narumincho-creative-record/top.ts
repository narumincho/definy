import { html } from "../gen/main";

export const topChildren: ReadonlyArray<html.HtmlElement> = [
  html.h1({}, "ナルミンチョの創作記録"),
  html.anchor(
    { url: new URL("https://twitter.com/naru_mincho") },
    "Twitter @naru_mincho"
  ),
  html.anchor(
    { url: new URL("https://github.com/narumincho") },
    "GitHub @narumincho"
  ),
  html.anchor(
    {
      url: new URL("https://www.youtube.com/channel/UCDGsMJptdPNN_dbPkTl9qjA/"),
    },
    "YouTube ナルミンチョ"
  ),
  html.anchor({ url: new URL("https://definy.app/?hl=ja") }, "definy"),
  html.anchor(
    { url: new URL("https://definy-dev.web.app/?hl=ja") },
    "nightly definy"
  ),
  html.div(
    {},
    "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"
  ),
  html.div({}, "SVGの基本"),
  html.div({}, "単体SVGと埋め込みSVG"),
  html.div({}, "DESIRED Routeについて"),
  html.div({}, "メッセージウィンドウの話"),
  html.div({}, "DESIRED RouteとNPIMEのフォントの描画処理"),
  html.div({}, "リストUIのボタン操作の挙動"),
  html.div({}, "UIの配色"),
  html.div({}, "モンスターとのエンカウントについて"),
  html.div({}, "星の図形について"),
  html.div({}, "DESIRED Routeに登場する予定だった敵モンスター"),
  html.div({}, "Nプチコン漢字入力(N Petitcom IME)"),
];
