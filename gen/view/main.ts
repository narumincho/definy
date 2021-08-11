import * as css from "../css/main";
import {
  Color,
  HtmlElement,
  HtmlOption,
  htmlElement,
  htmlElementNoEndTag,
} from "../html/main";
import { Language } from "../../localData";

/**
 * 見た目を表現するデータ. HTML Option より HTML と離れた, 抽象度の高く 扱いやすいものにする.
 * Definy と ナルミンチョの創作記録で両方の指定が可能なもの
 */
export type View = {
  /**
   * ページ名
   *
   * Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される
   */
  readonly pageName: string;

  /**
   * アプリ名 / サイト名 (HTML出力のみ反映)
   */
  readonly appName: string;

  /**
   * ページの説明 (HTML出力のみ反映)
   */
  readonly description: string;

  /**
   * テーマカラー
   */
  readonly themeColor: Color | undefined;

  /**
   * アイコン画像のURL
   */
  readonly iconUrl: URL;

  /**
   * 使用している言語
   */
  readonly language: Language | undefined;

  /**
   * OGPに使われるカバー画像のURL (CORSの制限を受けない)
   */
  readonly coverImageUrl: URL;

  /** ページのURL */
  readonly url: URL;

  /**
   * Web App マニフェストのURL
   *
   * https://developer.mozilla.org/en-US/docs/Web/Manifest
   */
  readonly webAppManifestUrl?: URL;

  /** 全体に適応されるスタイル. CSS */
  readonly style?: string;

  /** スタイルのURL */
  readonly styleUrlList?: ReadonlyArray<URL>;

  /** ES Modules形式のJavaScript */
  readonly script?: string;

  /** スクリプトのURL */
  readonly scriptUrlList?: ReadonlyArray<URL>;

  /** 子要素 */
  readonly box: Box;
};

/** 縦か横方向に積める箱 */
export type Box = {
  readonly type: "box";
  readonly direction: "x" | "y";
  readonly children: ReadonlyArray<SizeAndElementOrBox>;
  readonly gap: number;
  readonly padding: number;
  readonly height: number | undefined;
  readonly backgroundColor: string | undefined;
  readonly url: URL | undefined;
};

export type SizeAndElementOrBox = {
  readonly size: Size;
  readonly elementOrBox: Element | Box;
};

export type Size = number | "1fr" | "auto";

export const sizeAndElementOrBox = (
  size: SizeAndElementOrBox["size"],
  elementOrBox: Element | Box
): SizeAndElementOrBox => {
  return { size, elementOrBox };
};

export type CreateBoxOption = {
  readonly gap?: number;
  readonly padding?: number;
  readonly height?: number;
  /** @example "#7B920A" */
  readonly backgroundColor?: string;
  readonly url?: URL;
};

export const boxX = (
  option: CreateBoxOption,
  children: ReadonlyArray<SizeAndElementOrBox>
): Box => {
  return createBox("x", option, children);
};
export const boxY = (
  option: CreateBoxOption,
  children: ReadonlyArray<SizeAndElementOrBox>
): Box => {
  return createBox("y", option, children);
};

const createBox = (
  direction: "x" | "y",
  option: CreateBoxOption,
  children: ReadonlyArray<SizeAndElementOrBox>
): Box => {
  return {
    type: "box",
    direction,
    gap: option.gap ?? 0,
    padding: option.padding ?? 0,
    height: option.height,
    url: option.url,
    backgroundColor: option.backgroundColor,
    children,
  };
};

/** テキスト, リンクなどの要素 */
type Element =
  | {
      readonly type: "text";
      readonly padding: number;
      readonly text: string;
    }
  | {
      readonly type: "heading0";
      readonly text: string;
    }
  | {
      readonly type: "svg";
      readonly svg: Svg;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly type: "image";
      readonly url: URL;
      readonly width: number;
      readonly height: number;
    };

export type Svg = {
  readonly viewBox: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly svgElementList: ReadonlyArray<SvgElement>;
};

export type SvgElement =
  | {
      readonly type: "path";
      readonly pathText: string;
      readonly fill: string;
    }
  | {
      readonly type: "g";
      readonly transform: ReadonlyArray<string>;
      readonly svgElementList: ReadonlyArray<SvgElement>;
    };

export const textElement = (
  option: { padding?: number },
  text: string
): Element => {
  return {
    type: "text",
    padding: option.padding ?? 0,
    text,
  };
};
export const heading0 = (text: string): Element => {
  return {
    type: "heading0",
    text,
  };
};
export const svgElement = (
  option: { width: number; height: number },
  svg: Svg
): Element => {
  return {
    type: "svg",
    svg,
    width: option.width,
    height: option.height,
  };
};
export const imageElement = (option: {
  readonly url: URL;
  readonly width: number;
  readonly height: number;
}): Element => {
  return {
    type: "image",
    url: option.url,
    width: option.width,
    height: option.height,
  };
};

/**
 * View から HtmlOption に変換する
 */
export const viewToHtmlOption = (view: View): HtmlOption => {
  const htmlElementAndStyleDict = boxToHtmlElement(view.box);
  return {
    pageName: view.pageName,
    appName: view.appName,
    description: view.description,
    themeColor: view.themeColor,
    iconUrl: view.iconUrl,
    language: view.language,
    coverImageUrl: view.coverImageUrl,
    url: view.url,
    twitterCard: "SummaryCard",
    style: css.ruleListToString([
      {
        selector: "html",
        declarationList: [css.height("100%")],
      },
      {
        selector: "body",
        declarationList: [
          css.height("100%"),
          css.margin0,
          {
            property: "background-color",
            value: "black",
          },
          css.displayGrid,
          css.boxSizingBorderBox,
        ],
      },
      ...[...htmlElementAndStyleDict.styleDict].map(
        ([hashValue, declarationList]) => {
          return {
            selector: "." + sha256HashValueToClassName(hashValue),
            declarationList,
          };
        }
      ),
    ]),
    children: [htmlElementAndStyleDict.htmlElement],
  };
};

const boxToHtmlElement = (
  box: Box
): {
  readonly htmlElement: HtmlElement;
  readonly styleDict: ReadonlyMap<string, ReadonlyArray<css.Declaration>>;
} => {
  const styleDeclarationList: ReadonlyArray<css.Declaration> = [
    css.boxSizingBorderBox,
    css.displayGrid,
    {
      property: "grid-auto-flow",
      value: box.direction === "x" ? "column" : "row",
    },
    {
      property:
        box.direction === "x" ? "grid-template-columns" : "grid-template-rows",
      value: sizeListToStyleValue(box.children.map((c) => c.size)),
    },
    {
      property: "align-items",
      value: box.direction === "x" ? "center" : "start",
    },
    {
      property: "gap",
      value: `${box.gap}px`,
    },
    {
      property: "padding",
      value: `${box.padding}px`,
    },
    ...(box.height === undefined ? [] : [css.height(`${box.height}px`)]),
    ...(box.backgroundColor === undefined
      ? []
      : [
          {
            property: "background-color",
            value: box.backgroundColor,
          },
        ]),
    ...(box.url === undefined
      ? []
      : [{ property: "text-decoration", value: "none" }]),
  ];
  const className = css.declarationListToSha256HashValue(styleDeclarationList);
  const children = box.children.map((elementOrBox) =>
    elementOrBox.elementOrBox.type === "box"
      ? boxToHtmlElement(elementOrBox.elementOrBox)
      : elementToHtmlElement(elementOrBox.elementOrBox)
  );
  return {
    htmlElement: htmlElement(
      box.url === undefined ? "div" : "a",
      new Map<string, string>([
        ["class", sha256HashValueToClassName(className)],
        ...(box.url === undefined
          ? []
          : ([["href", box.url.toString()]] as const)),
      ]),
      children.map((c) => c.htmlElement)
    ),
    styleDict: new Map([
      ...children.flatMap((c) => [...c.styleDict]),
      [className, styleDeclarationList],
    ]),
  };
};

const elementToHtmlElement = (
  element: Element
): {
  readonly htmlElement: HtmlElement;
  readonly styleDict: ReadonlyMap<string, ReadonlyArray<css.Declaration>>;
} => {
  switch (element.type) {
    case "text": {
      const styleDeclarationList: ReadonlyArray<css.Declaration> = [
        {
          property: "color",
          value: "white",
        },
        {
          property: "padding",
          value: `${element.padding}px`,
        },
      ];
      const className =
        css.declarationListToSha256HashValue(styleDeclarationList);
      return {
        htmlElement: htmlElement(
          "div",
          new Map([["class", sha256HashValueToClassName(className)]]),
          element.text
        ),
        styleDict: new Map([[className, styleDeclarationList]]),
      };
    }
    case "heading0": {
      const styleDeclarationList: ReadonlyArray<css.Declaration> = [
        css.margin0,
        {
          property: "color",
          value: "white",
        },
      ];
      const className =
        css.declarationListToSha256HashValue(styleDeclarationList);
      return {
        htmlElement: htmlElement(
          "h1",
          new Map([["class", sha256HashValueToClassName(className)]]),
          element.text
        ),
        styleDict: new Map([[className, styleDeclarationList]]),
      };
    }
    case "svg": {
      const styleDeclarationList: ReadonlyArray<css.Declaration> = [
        css.width(element.width),
        css.height(element.height),
      ];
      const className =
        css.declarationListToSha256HashValue(styleDeclarationList);
      return {
        htmlElement: htmlElement(
          "svg",
          new Map([
            [
              "viewBox",
              [
                element.svg.viewBox.x,
                element.svg.viewBox.y,
                element.svg.viewBox.width,
                element.svg.viewBox.height,
              ].join(" "),
            ],
            ["className", className],
          ]),
          element.svg.svgElementList.map(svgElementToHtmlElement)
        ),
        styleDict: new Map([[className, styleDeclarationList]]),
      };
    }
    case "image": {
      const styleDeclarationList: ReadonlyArray<css.Declaration> = [
        css.width(element.width),
        css.height(element.height),
        {
          property: "object-fit",
          value: "cover",
        },
      ];
      const className =
        css.declarationListToSha256HashValue(styleDeclarationList);
      return {
        htmlElement: htmlElementNoEndTag(
          "img",
          new Map([
            ["src", element.url.toString()],
            ["class", sha256HashValueToClassName(className)],
          ])
        ),
        styleDict: new Map([[className, styleDeclarationList]]),
      };
    }
  }
};

const svgElementToHtmlElement = (svg: SvgElement): HtmlElement => {
  switch (svg.type) {
    case "path":
      return htmlElement(
        "path",
        new Map([
          ["d", svg.pathText],
          ["fill", svg.fill],
        ]),
        []
      );
    case "g":
      return htmlElement(
        "g",
        new Map([["transform", svg.transform.join(" ")]]),
        svg.svgElementList.map(svgElementToHtmlElement)
      );
  }
};

const sizeListToStyleValue = (sizeList: ReadonlyArray<Size>): string => {
  return sizeList.map(sizeToStyleValue).join(" ");
};

const sizeToStyleValue = (size: Size): string => {
  if (typeof size === "number") {
    return `${size}px`;
  }
  return size;
};

const sha256HashValueToClassName = (sha256HashValue: string): string => {
  return "nv_" + sha256HashValue;
};
