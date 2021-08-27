import { Box, Element, Size, SvgElement, View } from "./view";
import {
  HtmlElement,
  HtmlOption,
  htmlElement,
  htmlElementNoEndTag,
} from "../html/main";
import { css } from "../main";

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
        css.margin0,
        {
          property: "line-height",
          value: "1",
        },
      ];
      const className =
        css.declarationListToSha256HashValue(styleDeclarationList);
      return {
        htmlElement: htmlElement(
          markupToTagName(element.markup),
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

const markupToTagName = (markup: "none" | "heading1" | "heading2"): string => {
  switch (markup) {
    case "none":
      return "div";
    case "heading1":
      return "h1";
    case "heading2":
      return "h2";
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
