import { view } from "../gen/main";

const linkBackGroundColor = "#333333";

const twitterLogo: view.Svg = {
  viewBox: {
    x: 50,
    y: 50,
    width: 300,
    height: 300,
  },
  svgElementList: [
    {
      type: "path",
      fill: "#1da1f2",
      pathText:
        "M153.6 301.6c94.3 0 145.9-78.2 145.9-145.9c0-2.2 0-4.4-0.1-6.6c10-7.2 18.7-16.3 25.6-26.6c-9.2 4.1-19.1 6.8-29.5 8.1c10.6-6.3 18.7-16.4 22.6-28.4c-9.9 5.9-20.9 10.1-32.6 12.4c-9.4-10-22.7-16.2-37.4-16.2c-28.3 0-51.3 23-51.3 51.3c0 4 0.5 7.9 1.3 11.7c-42.6-2.1-80.4-22.6-105.7-53.6c-4.4 7.6-6.9 16.4-6.9 25.8c0 17.8 9.1 33.5 22.8 42.7c-8.4-0.3-16.3-2.6-23.2-6.4c0 0.2 0 0.4 0 0.7c0 24.8 17.7 45.6 41.1 50.3c-4.3 1.2-8.8 1.8-13.5 1.8c-3.3 0-6.5-0.3-9.6-0.9c6.5 20.4 25.5 35.2 47.9 35.6c-17.6 13.8-39.7 22-63.7 22c-4.1 0-8.2-0.2-12.2-0.7C97.7 293.1 124.7 301.6 153.6 301.6",
    },
  ],
};

const gitHubLogo: view.Svg = {
  viewBox: {
    x: 0,
    y: 0,
    width: 560,
    height: 560,
  },
  svgElementList: [
    {
      type: "g",
      transform: ["translate(0,560)", "scale(0.1,-0.1)"],
      svgElementList: [
        {
          type: "path",
          fill: "#dddddd",
          pathText:
            "M2571 4839 c-733 -82 -1361 -525 -1676 -1182 -488 -1019 -73 -2233 941 -2749 60 -31 154 -72 209 -93 116 -43 165 -43 202 0 22 25 23 33 23 242 l0 215 -27 -6 c-16 -4 -86 -9 -158 -12 -152 -7 -232 7 -328 59 -95 50 -147 110 -211 239 -61 126 -113 194 -190 251 -111 83 -131 118 -78 138 107 42 291 -57 387 -207 106 -165 229 -232 404 -221 108 7 211 40 211 68 0 39 43 145 81 201 45 66 57 56 -99 83 -497 85 -752 358 -803 858 -26 260 24 468 158 647 l48 65 -17 65 c-33 127 -16 355 34 465 12 27 14 27 78 22 119 -10 299 -82 454 -181 l52 -33 110 23 c276 58 562 58 838 0 l110 -23 52 33 c156 100 335 171 456 181 l66 6 28 -84 c37 -114 45 -299 17 -405 l-19 -71 49 -63 c164 -218 207 -519 122 -856 -95 -376 -368 -595 -817 -656 -49 -7 -88 -16 -88 -19 0 -4 11 -20 24 -36 39 -47 74 -125 90 -206 13 -61 16 -145 16 -416 0 -338 0 -340 23 -366 37 -43 86 -43 202 0 1143 427 1676 1745 1150 2842 -296 618 -865 1045 -1550 1164 -139 24 -440 33 -574 18z",
        },
      ],
    },
  ],
};

export const topBox: view.Box = view.boxY({}, [
  view.heading0("ナルミンチョの創作記録"),
  view.boxX({ padding: 16, gap: 8, height: 64 }, [
    view.boxX(
      {
        url: new URL("https://twitter.com/naru_mincho"),
        backgroundColor: linkBackGroundColor,
      },
      [
        view.svgElement({ width: 32, height: 32 }, twitterLogo),
        view.textElement("Twitter @naru_mincho"),
      ]
    ),
    view.boxX(
      {
        url: new URL("https://github.com/narumincho"),
        backgroundColor: linkBackGroundColor,
      },
      [
        view.svgElement({ width: 32, height: 32 }, gitHubLogo),
        view.textElement("GitHub @narumincho"),
      ]
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
