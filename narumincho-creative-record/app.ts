import * as view from "../gen/view/view";
import { portNumber } from "./distributionPath";
import { resourceUrl } from "./resource/main";
import { topBox } from "./top";

export const naruminchoCreativeRecordView: view.View = {
  appName: "ナルミンチョの創作記録",
  box: topBox,
  coverImageUrl: resourceUrl.icon,
  description:
    "革新的なプログラミング言語のDefiny, Web技術, 作っているゲームなどについて解説しています",
  iconUrl: resourceUrl.icon,
  language: "Japanese",
  pageName: "ナルミンチョの創作記録",
  scriptUrlList: [],
  styleUrlList: [],
  url: new URL(`http://localhost:${portNumber}`),
  themeColor: undefined,
};
