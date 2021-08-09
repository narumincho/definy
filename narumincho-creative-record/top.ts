import { view } from "../gen/main";

export const topBox: view.Box = view.boxY({}, [
  view.heading0("ナルミンチョの創作記録"),
  view.boxX({ padding: 16, gap: 8 }, [
    view.boxX({ url: new URL("https://twitter.com/naru_mincho") }, [
      view.textElement("Twitter @naru_mincho"),
    ]),
    view.boxX({ url: new URL("https://github.com/narumincho") }, [
      view.textElement("GitHub @narumincho"),
    ]),
    view.boxX(
      {
        url: new URL(
          "https://www.youtube.com/channel/UCDGsMJptdPNN_dbPkTl9qjA/"
        ),
      },
      [view.textElement("YouTube ナルミンチョ")]
    ),
  ]),
  view.boxY({ padding: 16, gap: 8 }, [
    view.boxX(
      {
        url: new URL("https://definy.app/?hl=ja"),
      },
      [view.textElement("definy")]
    ),
    view.boxX(
      {
        url: new URL("https://definy-dev.web.app/?hl=ja"),
      },
      [view.textElement("nightly definy")]
    ),
    view.textElement(
      "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"
    ),
    view.textElement("SVGの基本"),
    view.textElement("単体SVGと埋め込みSVG"),
    view.textElement("DESIRED Routeについて"),
    view.textElement("メッセージウィンドウの話"),
    view.textElement("DESIRED RouteとNPIMEのフォントの描画処理"),
    view.textElement("リストUIのボタン操作の挙動"),
    view.textElement("UIの配色"),
    view.textElement("モンスターとのエンカウントについて"),
    view.textElement("星の図形について"),
    view.textElement("DESIRED Routeに登場する予定だった敵モンスター"),
    view.textElement("Nプチコン漢字入力(N Petitcom IME)"),
  ]),
]);
