import * as view from "../gen/view/view";
import { App } from "../gen/view/app";
import { portNumber } from "./distributionPath";
import { staticResourceUrl } from "./resourceUrl";
import { topBox } from "./top";

export const naruminchoCreativeRecordApp: App<undefined, undefined> = {
  initState: undefined,
  stateToView: () => naruminchoCreativeRecordView,
  updateState: () => undefined,
};

const naruminchoCreativeRecordView: view.View<undefined> = {
  appName: "ナルミンチョの創作記録",
  box: topBox,
  coverImageUrl: staticResourceUrl.iconPng,
  description:
    "革新的なプログラミング言語のDefiny, Web技術, 作っているゲームなどについて解説しています",
  iconUrl: staticResourceUrl.iconPng,
  language: "Japanese",
  pageName: "ナルミンチョの創作記録",
  scriptUrlList: [],
  styleUrlList: [],
  url: new URL(`http://localhost:${portNumber}`),
  themeColor: undefined,
};
