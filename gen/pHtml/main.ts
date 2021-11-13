import * as d from "../../localData";
import * as e from "../../output/TypeScriptEntryPoint";

export type HtmlOption = {
  readonly appName: string;
  readonly bodyClass: string | undefined;
  readonly coverImagePath: ReadonlyArray<string>;
  readonly description: string;
  readonly iconPath: ReadonlyArray<string>;
  readonly language: d.Language | undefined;
  readonly origin: string;
  readonly pageName: string;
  readonly path: ReadonlyArray<string> | undefined;
  readonly scriptPath: ReadonlyArray<string> | undefined;
  readonly style: string | undefined;
  readonly stylePath: ReadonlyArray<string> | undefined;
  readonly themeColor: {
    /** 0 ～ 255 の整数 */
    readonly r: number;
    /** 0 ～ 255 の整数 */
    readonly g: number;
    /** 0 ～ 255 の整数 */
    readonly b: number;
    /** 0 ～ 1 */
    readonly a: number;
  };
  /** コンテンツ作成者のTwitterID @を含む */
  readonly creatorTwitterId: string | undefined;
};

export const htmlOptionToString = (option: HtmlOption): string => {
  return e.htmlOptionToString({
    appName: stringToNonEmptyString(option.appName),
    bodyChildren: [],
    bodyClass:
      typeof option.bodyClass === "string"
        ? e.just(option.bodyClass)
        : e.nothing(),
    coverImagePath: e.pathAndSearchParamsFromPath(option.coverImagePath),
    description: option.description,
    iconPath: e.pathAndSearchParamsFromPath(option.iconPath),
    language:
      option.language === undefined
        ? e.nothing()
        : e.just(dLanguageToPureScriptLanguage(option.language)),
    origin: stringToNonEmptyString(option.origin),
    pageName: stringToNonEmptyString(option.pageName),
    path:
      option.path === undefined
        ? e.nothing()
        : e.just(e.pathAndSearchParamsFromPath(option.path)),
    scriptPath:
      option.scriptPath === undefined
        ? e.nothing()
        : e.just(e.pathAndSearchParamsFromPath(option.scriptPath)),
    style:
      typeof option.style === "string" ? e.just(option.style) : e.nothing(),
    stylePath:
      option.stylePath === undefined
        ? e.nothing()
        : e.just(e.pathAndSearchParamsFromPath(option.stylePath)),
    themeColor: e.colorFrom(option.themeColor),
    creatorTwitterId:
      typeof option.creatorTwitterId === "string"
        ? e.just(option.creatorTwitterId)
        : e.nothing(),
  });
};

const dLanguageToPureScriptLanguage = (language: d.Language): e.Language => {
  switch (language) {
    case "English":
      return e.english;
    case "Japanese":
      return e.japanese;
    case "Esperanto":
      return e.esperanto;
  }
};

/**
 * 空でない文字列を指定する必要あり
 */
const stringToNonEmptyString = (str: string): e.NonEmptyString => {
  return str as e.NonEmptyString;
};
