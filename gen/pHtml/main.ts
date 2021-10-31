import * as Color from "../../output/Color";
import * as Language from "../../output/Language";
import * as Maybe from "../../output/Data.Maybe";
import * as StructuredUrl from "../../output/StructuredUrl";
import {
  NonEmptyString,
  SummaryCardWithLargeImage,
} from "../../output/Html.Data";
import { htmlOptionToString } from "../../output/Html.ToString";

console.log(
  htmlOptionToString({
    appName: "アプリ名だなー" as NonEmptyString,
    bodyChildren: [],
    bodyClass: Maybe.Just.create("sampleClass"),
    coverImagePath: StructuredUrl.fromPath(["a", "b", "c"]),
    description: "説明文",
    iconPath: StructuredUrl.fromPath(["iconPath"]),
    language: Maybe.Just.create(Language.English.value),
    origin: "https://sample.com" as NonEmptyString,
    pageName: "ページ名だー" as NonEmptyString,
    path: Maybe.Just.create(StructuredUrl.fromPath(["the", "path"])),
    scriptPath: Maybe.Just.create(StructuredUrl.fromPath(["script"])),
    style: Maybe.Just.create("html { height: 100% }"),
    stylePath: Maybe.Just.create(StructuredUrl.fromPath(["style"])),
    themeColor: Color.rgba(10)(20)(30)(255),
    twitterCard: SummaryCardWithLargeImage.value,
  })
);
