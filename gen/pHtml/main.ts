import * as Color from "../../output/Color";
import * as HtmlToString from "../../output/Html.ToString";
import * as Language from "../../output/Language";
import * as Maybe from "../../output/Data.Maybe";
import * as StructuredUrl from "../../output/StructuredUrl";
import {
  NonEmptyString,
  SummaryCardWithLargeImage,
} from "../../output/Html.Data";

export type HtmlOption = {
  readonly appName: string;
  readonly bodyClass: string | undefined;
  readonly coverImagePath: ReadonlyArray<string>;
  readonly description: string;
  readonly iconPath: ReadonlyArray<string>;
  readonly language: "Japanese" | "English" | undefined;
  readonly origin: string;
  readonly pageName: string;
  readonly path: ReadonlyArray<string> | undefined;
  readonly scriptPath: ReadonlyArray<string> | undefined;
  readonly style: string | undefined;
  readonly stylePath: ReadonlyArray<string> | undefined;
  readonly themeColor: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;
  };
};

export const htmlOptionToString = (option: HtmlOption): string => {
  return HtmlToString.htmlOptionToString({
    appName: option.appName as NonEmptyString,
    bodyChildren: [],
    bodyClass:
      typeof option.bodyClass === "string"
        ? Maybe.Just.create(option.bodyClass)
        : Maybe.Nothing.value,
    coverImagePath: StructuredUrl.fromPath(option.coverImagePath),
    description: option.description,
    iconPath: StructuredUrl.fromPath(option.iconPath),
    language:
      option.language === undefined
        ? Maybe.Nothing.value
        : Maybe.Just.create(
            option.language === "English"
              ? Language.English.value
              : Language.Japanese.value
          ),
    origin: option.origin as NonEmptyString,
    pageName: option.pageName as NonEmptyString,
    path:
      option.path === undefined
        ? Maybe.Nothing.value
        : Maybe.Just.create(StructuredUrl.fromPath(option.path)),
    scriptPath:
      option.scriptPath === undefined
        ? Maybe.Nothing.value
        : Maybe.Just.create(StructuredUrl.fromPath(option.scriptPath)),
    style:
      typeof option.style === "string"
        ? Maybe.Just.create(option.style)
        : Maybe.Nothing.value,
    stylePath:
      option.stylePath === undefined
        ? Maybe.Nothing.value
        : Maybe.Just.create(StructuredUrl.fromPath(option.stylePath)),
    themeColor: Color.rgba(option.themeColor.r)(option.themeColor.g)(
      option.themeColor.b
    )(option.themeColor.a),
    twitterCard: SummaryCardWithLargeImage.value,
  });
};
