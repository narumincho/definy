import * as css from "../css/main";
import { Color, HtmlElement, HtmlOption, htmlElement } from "../html/main";
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

export const textElement = (text: string): Element => {
  return {
    type: "text",
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

/**
 * View から HtmlOption に変換する
 */
export const viewToHtmlOption = (view: View): HtmlOption => {
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
    style: `html ${css.declarationBlockToString([css.height("100%")])}
    
    body ${css.declarationBlockToString([
      css.height("100%"),
      css.margin0,
      {
        property: "background-color",
        value: "black",
      },
      css.displayGrid,
      css.boxSizingBorderBox,
    ])}
  `,
    children: [boxToHtmlElement(view.box)],
  };
};

const boxToHtmlElement = (box: Box): HtmlElement => {
  return htmlElement(
    box.url === undefined ? "div" : "a",
    new Map<string, string>([
      [
        "style",
        css.declarationListToString([
          css.boxSizingBorderBox,
          css.displayGrid,
          {
            property: "grid-auto-flow",
            value: box.direction === "x" ? "column" : "row",
          },
          {
            property:
              box.direction === "x"
                ? "grid-template-columns"
                : "grid-template-rows",
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
        ]),
      ],
      ...(box.url === undefined
        ? []
        : ([["href", box.url.toString()]] as const)),
    ]),
    box.children.map((elementOrBox) =>
      elementOrBox.elementOrBox.type === "box"
        ? boxToHtmlElement(elementOrBox.elementOrBox)
        : elementToHtmlElement(elementOrBox.elementOrBox)
    )
  );
};

const elementToHtmlElement = (element: Element): HtmlElement => {
  switch (element.type) {
    case "text":
      return htmlElement(
        "div",
        new Map([
          [
            "style",
            css.declarationListToString([
              {
                property: "color",
                value: "white",
              },
            ]),
          ],
        ]),
        element.text
      );
    case "heading0":
      return htmlElement(
        "h1",
        new Map([
          [
            "style",
            css.declarationListToString([
              css.margin0,
              {
                property: "color",
                value: "white",
              },
            ]),
          ],
        ]),
        element.text
      );
    case "svg":
      return htmlElement(
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
          [
            "style",
            css.declarationListToString([
              css.width(element.width),
              css.height(element.height),
            ]),
          ],
        ]),
        element.svg.svgElementList.map(svgElementToHtmlElement)
      );
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
