import { view } from "../gen/main";

const linkBackGroundColor = "#333333";

export const topBox: view.Box = view.boxY({}, [
  view.heading0("ナルミンチョの創作記録"),
  view.boxX({ padding: 16, gap: 8, height: 64 }, [
    view.boxX(
      {
        url: new URL("https://twitter.com/naru_mincho"),
        backgroundColor: linkBackGroundColor,
      },
      [view.textElement("Twitter @naru_mincho")]
    ),
    view.boxX(
      {
        url: new URL("https://github.com/narumincho"),
        backgroundColor: linkBackGroundColor,
      },
      [view.textElement("GitHub @narumincho")]
    ),
    view.boxX(
      {
        url: new URL(
          "https://www.youtube.com/channel/UCDGsMJptdPNN_dbPkTl9qjA/"
        ),
        backgroundColor: linkBackGroundColor,
      },
      [view.textElement("YouTube ナルミンチョ")]
    ),
  ]),
  view.boxY({ padding: 16, gap: 8 }, [
    view.boxX(
      {
        url: new URL("https://definy.app/?hl=ja"),
        backgroundColor: linkBackGroundColor,
      },
      [view.textElement("definy")]
    ),
    view.boxX(
      {
        url: new URL("https://definy-dev.web.app/?hl=ja"),
        backgroundColor: linkBackGroundColor,
      },
      [view.textElement("nightly definy")]
    ),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement(
        "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"
      ),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("SVGの基本"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("単体SVGと埋め込みSVG"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("DESIRED Routeについて"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("メッセージウィンドウの話"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("DESIRED RouteとNPIMEのフォントの描画処理"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("リストUIのボタン操作の挙動"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("UIの配色"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("モンスターとのエンカウントについて"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("星の図形について"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("DESIRED Routeに登場する予定だった敵モンスター"),
    ]),
    view.boxX({ padding: 4, backgroundColor: linkBackGroundColor }, [
      view.textElement("Nプチコン漢字入力(N Petitcom IME)"),
    ]),
  ]),
]);
