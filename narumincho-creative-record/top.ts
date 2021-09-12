import * as view from "../gen/view/view";
import { Location, locationToUrl } from "./location";
import { gitHubLogo, twitterLogo, webSiteLogo, youTubeLogo } from "./svgImage";
import { groupBySize } from "../common/util";
import { staticResourceUrl } from "./viewOut";

const linkBackGroundColor = "#333333";

const snsLink = (
  url: URL,
  logo: view.Svg,
  text: string
): view.Box<undefined> => {
  return view.boxX(
    {
      url,
      padding: 8,
      gap: 8,
      backgroundColor: linkBackGroundColor,
    },
    [
      view.svgElement({ width: { type: "rem", value: 2 }, height: 2 }, logo),
      view.textElement({ padding: 8 }, text),
    ]
  );
};

const externalLink = (
  url: URL,
  imageUrl: URL,
  text: string
): view.Box<undefined> => {
  return view.boxY(
    {
      url,
      backgroundColor: linkBackGroundColor,
    },
    [
      view.imageElement({
        url: imageUrl,
        width: { type: "percentage", value: 100 },
        height: 8,
      }),
      view.textElement({ padding: 8 }, text),
    ]
  );
};

const articleLink = (
  articleTitleAndImageUrl: ArticleTitleAndImageUrl
): view.Box<undefined> => {
  return view.boxY(
    {
      backgroundColor: linkBackGroundColor,
      url: locationToUrl(articleTitleAndImageUrl.location),
    },
    [
      view.imageElement({
        url: articleTitleAndImageUrl.imageUrl,
        width: { type: "percentage", value: 100 },
        height: 8,
      }),
      view.textElement({ padding: 8 }, articleTitleAndImageUrl.title),
    ]
  );
};

type ArticleTitleAndImageUrl = {
  readonly imageUrl: URL;
  readonly title: string;
  readonly location: Location;
};

const articleListToViewElement = (
  list: ReadonlyArray<ArticleTitleAndImageUrl>
): view.Box<undefined> => {
  return view.boxY(
    { padding: 8, gap: 8 },
    groupBySize(list, 3).map((row) =>
      view.boxX(
        { gap: 8, gridTemplateColumns1FrCount: 3 },
        row.map(articleLink)
      )
    )
  );
};

const copyright: view.Element<undefined> = view.textElement(
  { padding: 8 },
  "© 2021 narumincho"
);

export const topBox: view.Box<undefined> = view.boxY({}, [
  view.boxY(
    { padding: { topBottom: 48, leftRight: 0 }, url: locationToUrl("top") },
    [
      view.svgElement(
        {
          width: { type: "percentage", value: 90 },
          height: 5,
          justifySelf: "center",
        },
        webSiteLogo
      ),
    ]
  ),
  view.textElement(
    { markup: "heading2", padding: 8 },
    "ナルミンチョの SNS アカウント"
  ),
  view.boxX({ padding: 8, gap: 8, height: 4 }, [
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
  ]),
  view.textElement(
    { markup: "heading2", padding: 8 },
    "ナルミンチョが作った Webアプリ"
  ),
  view.boxX({ padding: 8, gap: 8, gridTemplateColumns1FrCount: 3 }, [
    externalLink(
      new URL("https://definy.app/?hl=ja"),
      staticResourceUrl.definy20210811Png,
      "definy"
    ),
    externalLink(
      new URL("https://narumincho-creative-record.web.app/"),
      staticResourceUrl.gravity_starPng,
      "重力星"
    ),
    externalLink(
      new URL("https://tsukumart.com/"),
      staticResourceUrl.tsukumartPng,
      "つくマート"
    ),
  ]),
  view.textElement(
    { markup: "heading2", padding: 8 },
    "ナルミンチョが書いた 記事"
  ),
  articleListToViewElement([
    {
      title:
        "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する",
      imageUrl: staticResourceUrl.powershell_iconPng,
      location: "powershellRecursion",
    },
    {
      title: "SVGの基本",
      imageUrl: staticResourceUrl.svg_basicPng,
      location: "svgBasic",
    },
    {
      title: "単体SVGと埋め込みSVG",
      imageUrl: staticResourceUrl.grape_svg_codePng,
      location: "svgStandaloneEmbed",
    },
    {
      title: "DESIRED Routeについて",
      imageUrl: staticResourceUrl.desired_route_titlePng,
      location: "aboutDesiredRoute",
    },
    {
      title: "メッセージウィンドウの話",
      imageUrl: staticResourceUrl.windowPng,
      location: "messageWindow",
    },
    {
      title: "DESIRED RouteとNPIMEのフォントの描画処理",

      imageUrl: staticResourceUrl.fontPng,
      location: "desiredRouteFont",
    },
    {
      title: "リストUIのボタン操作の挙動",
      imageUrl: staticResourceUrl.list_uiPng,
      location: "listSelectionBehavior",
    },
    {
      title: "UIの配色",
      imageUrl: staticResourceUrl.colorPng,
      location: "uiColor",
    },
    {
      title: "モンスターとのエンカウントについて",
      imageUrl: staticResourceUrl.battlePng,
      location: "desiredRouteEncounter",
    },
    {
      title: "星の図形について",
      imageUrl: staticResourceUrl.starPng,
      location: "star",
    },
    {
      title: "DESIRED Routeに登場する予定だった敵モンスター",
      imageUrl: staticResourceUrl.kamausagiPng,
      location: "desiredRouteMonster",
    },
    {
      title: "Nプチコン漢字入力(N Petitcom IME)",
      imageUrl: staticResourceUrl.henkanPng,
      location: "nPetitcomIme",
    },
  ]),
  copyright,
]);
