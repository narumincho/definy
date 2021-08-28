import * as view from "../gen/view/view";
import { groupBySize } from "../common/util";
import { staticResourceUrl } from "./resourceUrl";

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

const youTubeLogo: view.Svg = {
  viewBox: {
    x: 0,
    y: 0,
    width: 30,
    height: 20,
  },
  svgElementList: [
    {
      type: "path",
      fill: "#ff0000",
      pathText:
        "M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z",
    },
    {
      type: "path",
      fill: "#dddddd",
      pathText: "M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z",
    },
  ],
};

const snsLink = (
  url: URL,
  logo: view.Svg,
  text: string
): view.SizeAndElementOrBox<undefined> => {
  return view.sizeAndElementOrBox(
    "1fr",
    view.boxX(
      {
        url,
        padding: 8,
        gap: 8,
        backgroundColor: linkBackGroundColor,
      },
      [
        view.sizeAndElementOrBox(
          32,
          view.svgElement({ width: 32, height: 32 }, logo)
        ),
        view.sizeAndElementOrBox("1fr", view.textElement({ padding: 8 }, text)),
      ]
    )
  );
};

const externalLink = (url: URL, imageUrl: URL, text: string) => {
  return view.sizeAndElementOrBox(
    256,
    view.boxY(
      {
        url,
        backgroundColor: linkBackGroundColor,
      },
      [
        view.sizeAndElementOrBox(
          128,
          view.imageElement({
            url: imageUrl,
            width: 256,
            height: 128,
          })
        ),
        view.sizeAndElementOrBox("1fr", view.textElement({ padding: 8 }, text)),
      ]
    )
  );
};

const articleLink = (
  articleTitleAndImageUrl: ArticleTitleAndImageUrl
): view.SizeAndElementOrBox<undefined> => {
  return view.sizeAndElementOrBox(
    "1fr",
    view.boxY(
      {
        backgroundColor: linkBackGroundColor,
      },
      [
        view.sizeAndElementOrBox(
          128,
          view.imageElement({
            url: articleTitleAndImageUrl.imageUrl,
            width: 256,
            height: 128,
          })
        ),
        view.sizeAndElementOrBox(
          "1fr",
          view.textElement({ padding: 8 }, articleTitleAndImageUrl.title)
        ),
      ]
    )
  );
};

type ArticleTitleAndImageUrl = {
  readonly imageUrl: URL;
  readonly title: string;
};

const articleListToViewElement = (
  list: ReadonlyArray<ArticleTitleAndImageUrl>
): view.Box<undefined> => {
  return view.boxY(
    { padding: 8, gap: 8 },
    groupBySize(list, 3).map((row) =>
      view.sizeAndElementOrBox(
        "auto",
        view.boxX({ gap: 8 }, row.map(articleLink))
      )
    )
  );
};

export const topBox: view.Box<undefined> = view.boxY({}, [
  view.sizeAndElementOrBox(
    72,
    view.textElement(
      { markup: "heading1", padding: 16 },
      "ナルミンチョの創作記録"
    )
  ),
  view.sizeAndElementOrBox(
    "auto",
    view.textElement(
      { markup: "heading2", padding: 8 },
      "ナルミンチョの SNS アカウント"
    )
  ),
  view.sizeAndElementOrBox(
    "auto",
    view.boxX({ padding: 8, gap: 8, height: 64 }, [
      snsLink(
        new URL("https://twitter.com/naru_mincho"),
        twitterLogo,
        "@naru_mincho"
      ),
      snsLink(
        new URL("https://github.com/narumincho"),
        gitHubLogo,
        "@narumincho"
      ),
      snsLink(
        new URL("https://www.youtube.com/channel/UCDGsMJptdPNN_dbPkTl9qjA/"),
        youTubeLogo,
        "ナルミンチョ"
      ),
    ])
  ),
  view.sizeAndElementOrBox(
    "auto",
    view.textElement(
      { markup: "heading2", padding: 8 },
      "ナルミンチョが作った Webアプリ"
    )
  ),
  view.sizeAndElementOrBox(
    "auto",
    view.boxX({ padding: 8, gap: 8 }, [
      externalLink(
        new URL("https://definy.app/?hl=ja"),
        staticResourceUrl.definy20190212Png,
        "definy"
      ),
      externalLink(
        new URL("https://definy-dev.web.app/?hl=ja"),
        staticResourceUrl.definy20210811Png,
        "nightly definy"
      ),
      externalLink(
        new URL("https://narumincho-creative-record.web.app/"),
        staticResourceUrl["gravity-starPng"],
        "重力星"
      ),
      externalLink(
        new URL("https://tsukumart.com/"),
        staticResourceUrl.tsukumartPng,
        "つくマート"
      ),
    ])
  ),
  view.sizeAndElementOrBox(
    "auto",
    view.textElement(
      { markup: "heading2", padding: 8 },
      "ナルミンチョが書いた 記事"
    )
  ),
  view.sizeAndElementOrBox(
    "auto",
    articleListToViewElement([
      {
        title:
          "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "SVGの基本",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "単体SVGと埋め込みSVG",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "DESIRED Routeについて",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "メッセージウィンドウの話",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "DESIRED RouteとNPIMEのフォントの描画処理",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "リストUIのボタン操作の挙動",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "UIの配色",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "モンスターとのエンカウントについて",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "星の図形について",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "DESIRED Routeに登場する予定だった敵モンスター",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
      {
        title: "Nプチコン漢字入力(N Petitcom IME)",
        imageUrl: staticResourceUrl.definy20210811Png,
      },
    ])
  ),
]);
