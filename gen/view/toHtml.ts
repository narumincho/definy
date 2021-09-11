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
export const viewToHtmlOption = <Message>(view: View<Message>): HtmlOption => {
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
        selector: css.typeSelector("html"),
        declarationList: [css.height100Percent],
      },
      {
        selector: css.typeSelector("body"),
        declarationList: [
          css.height100Percent,
          css.margin0,
          {
            property: "background-color",
            value: "black",
          },
          css.displayGrid,
          css.boxSizingBorderBox,
          css.alignItems("start"),
        ],
      },
      ...[...htmlElementAndStyleDict.styleDict].map(
        ([hashValue, declarationList]) => {
          return {
            selector: css.classSelector(sha256HashValueToClassName(hashValue)),
            declarationList,
          };
        }
      ),
    ]),
    children: [htmlElementAndStyleDict.htmlElement],
  };
};

const boxToHtmlElement = <Message>(
  box: Box<Message>
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
    css.alignItems(box.direction === "x" ? "center" : "start"),
    {
      property: "gap",
      value: `${box.gap}px`,
    },
    {
      property: "padding",
      value: `${box.paddingTopBottom}px ${box.paddingLeftRight}px`,
    },
    {
      property: "overflow",
      value: "hidden",
    },
    ...(box.height === undefined ? [] : [css.heightRem(box.height)]),
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
  const children = box.children.map(elementToHtmlElement);
  return {
    htmlElement: htmlElement(
      box.url === undefined ? "div" : "a",
      new Map<string, string>([
        sha256HashValueToClassAttributeNameAndValue(className),
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

const elementToHtmlElement = <Message>(
  element: Element<Message>
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
          new Map([sha256HashValueToClassAttributeNameAndValue(className)]),
          element.text
        ),
        styleDict: new Map([[className, styleDeclarationList]]),
      };
    }
    case "svg": {
      const styleDeclarationList: ReadonlyArray<css.Declaration> = [
        element.width.type === "rem"
          ? css.widthRem(element.width.value)
          : css.widthPercent(element.width.value),
        css.heightRem(element.height),
        ...(element.justifySelf === "center"
          ? [
              {
                property: "justify-self",
                value: "center",
              },
            ]
          : []),
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
            sha256HashValueToClassAttributeNameAndValue(className),
          ]),
          element.svg.svgElementList.map(svgElementToHtmlElement)
        ),
        styleDict: new Map([[className, styleDeclarationList]]),
      };
    }
    case "image": {
      const styleDeclarationList: ReadonlyArray<css.Declaration> = [
        css.widthRem(element.width),
        css.heightRem(element.height),
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
            sha256HashValueToClassAttributeNameAndValue(className),
          ])
        ),
        styleDict: new Map([[className, styleDeclarationList]]),
      };
    }
    case "box": {
      return boxToHtmlElement(element);
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

const sha256HashValueToClassAttributeNameAndValue = (
  sha256HashValue: string
): readonly [string, string] => {
  return ["class", sha256HashValueToClassName(sha256HashValue)];
};

const sha256HashValueToClassName = (sha256HashValue: string): string => {
  return "nv_" + sha256HashValue;
};
