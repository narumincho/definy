import { Box, Element, PercentageOrRem, SvgElement, View } from "./view";
import { FileName, fileNameToString } from "../fileSystem/data";
import {
  HtmlElement,
  HtmlOption,
  htmlElement,
  htmlElementNoEndTag,
} from "../html/main";
import { createHash } from "sha256-uint8array";
import { css } from "../main";
import { declarationListToString } from "../css/main";

/**
 * View から HtmlOption に変換する
 */
export const viewToHtmlOption = <Message>(
  view: View<Message>,
  scriptFileName: FileName
): HtmlOption => {
  const htmlElementAndStyleDict = boxToHtmlElementAndStyleDict(view.box);
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
    style: css.ruleListToString({
      ruleList: [
        {
          selector: css.typeSelector("html"),
          declarationList: [css.height100Percent],
        },
        {
          selector: css.typeSelector("body"),
          declarationList: [
            css.height100Percent,
            css.margin0,
            css.backgroundColor("black"),
            css.displayGrid,
            css.boxSizingBorderBox,
            css.alignItems("start"),
          ],
        },
        ...[...htmlElementAndStyleDict.styleDict].flatMap(
          ([hashValue, viewStyle]) => {
            return [
              ...(viewStyle.declarationList.length === 0
                ? []
                : [
                    {
                      selector: css.classSelector(
                        sha256HashValueToClassName(hashValue),
                        false
                      ),
                      declarationList: viewStyle.declarationList,
                    },
                  ]),
              ...(viewStyle.hoverDeclarationList.length === 0
                ? []
                : [
                    {
                      selector: css.classSelector(
                        sha256HashValueToClassName(hashValue),
                        true
                      ),
                      declarationList: viewStyle.hoverDeclarationList,
                    },
                  ]),
            ];
          }
        ),
      ],
      keyframesList: [...htmlElementAndStyleDict.keyframesDict].flatMap(
        ([hashValue, keyframeList]) => {
          return {
            name: sha256HashValueToAnimationName(hashValue),
            keyframeList,
          };
        }
      ),
    }),
    scriptUrlList: [
      new URL(
        view.origin +
          "/" +
          fileNameToString({
            fileType: "JavaScript",
            name: scriptFileName.name,
          })
      ),
    ],
    children: [htmlElementAndStyleDict.htmlElement],
  };
};

type ViewStyle = {
  readonly declarationList: ReadonlyArray<css.Declaration>;
  readonly hoverDeclarationList: ReadonlyArray<css.Declaration>;
};

type HtmlElementAndStyleDict = {
  readonly htmlElement: HtmlElement;
  readonly styleDict: ReadonlyMap<string, ViewStyle>;
  readonly keyframesDict: ReadonlyMap<string, ReadonlyArray<css.Keyframe>>;
};

const boxToHtmlElementAndStyleDict = <Message>(
  box: Box<Message>
): HtmlElementAndStyleDict => {
  const keyframeResult = boxGetKeyframeListAndAnimationName(box);

  const viewStyle: ViewStyle = {
    declarationList: [
      css.boxSizingBorderBox,
      css.displayGrid,
      {
        property: "grid-auto-flow",
        value: box.direction === "x" ? "column" : "row",
      },
      css.alignItems("stretch"),
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
        : [css.backgroundColor(box.backgroundColor)]),
      ...(box.url === undefined
        ? []
        : [{ property: "text-decoration", value: "none" }]),
      ...(box.gridTemplateColumns1FrCount === undefined
        ? []
        : [
            {
              property: "grid-template-columns",
              value: new Array(box.gridTemplateColumns1FrCount)
                .fill("1fr")
                .join(" "),
            },
          ]),
    ],
    hoverDeclarationList:
      keyframeResult === undefined
        ? []
        : [
            {
              property: "animation",
              value:
                sha256HashValueToAnimationName(
                  keyframeResult.animationHashValue
                ) +
                " " +
                keyframeResult.duration.toString() +
                "ms",
            },
          ],
  };
  const className = viewStyleToSha256HashValue(viewStyle);

  const children = box.children.map(elementToHtmlElementAndStyleDict);
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
      [className, viewStyle],
    ]),
    keyframesDict: new Map([
      ...children.flatMap((c) => [...c.keyframesDict]),
      ...(keyframeResult === undefined
        ? []
        : ([
            [keyframeResult.animationHashValue, keyframeResult.keyframeList],
          ] as const)),
    ]),
  };
};

const boxGetKeyframeListAndAnimationName = <Message>(
  box: Box<Message>
):
  | {
      readonly keyframeList: ReadonlyArray<css.Keyframe>;
      readonly animationHashValue: string;
      readonly duration: number;
    }
  | undefined => {
  const animation = box.hover.animation;
  if (animation === undefined) {
    return undefined;
  }
  return {
    keyframeList: animation.keyframeList,
    animationHashValue: keyframeListToSha256HashValue(animation.keyframeList),
    duration: animation.duration,
  };
};

const elementToHtmlElementAndStyleDict = <Message>(
  element: Element<Message>
): HtmlElementAndStyleDict => {
  switch (element.type) {
    case "text": {
      const viewStyle: ViewStyle = {
        declarationList: [
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
        ],
        hoverDeclarationList: [],
      };
      const className = viewStyleToSha256HashValue(viewStyle);
      return {
        htmlElement: htmlElement(
          markupToTagName(element.markup),
          new Map([sha256HashValueToClassAttributeNameAndValue(className)]),
          element.text
        ),
        styleDict: new Map([[className, viewStyle]]),
        keyframesDict: new Map(),
      };
    }
    case "svg": {
      const viewStyle: ViewStyle = {
        declarationList: [
          percentageOrRemWidthToCssDeclaration(element.width),
          css.heightRem(element.height),
          ...(element.justifySelf === "center"
            ? [
                {
                  property: "justify-self",
                  value: "center",
                },
              ]
            : []),
        ],
        hoverDeclarationList: [],
      };
      const className = viewStyleToSha256HashValue(viewStyle);
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
        styleDict: new Map([[className, viewStyle]]),
        keyframesDict: new Map(),
      };
    }
    case "image": {
      const viewStyle: ViewStyle = {
        declarationList: [
          percentageOrRemWidthToCssDeclaration(element.width),
          css.heightRem(element.height),
          {
            property: "object-fit",
            value: "cover",
          },
        ],
        hoverDeclarationList: [],
      };
      const className = viewStyleToSha256HashValue(viewStyle);
      return {
        htmlElement: htmlElementNoEndTag(
          "img",
          new Map([
            ["src", element.url.toString()],
            sha256HashValueToClassAttributeNameAndValue(className),
          ])
        ),
        styleDict: new Map([[className, viewStyle]]),
        keyframesDict: new Map(),
      };
    }
    case "box": {
      return boxToHtmlElementAndStyleDict(element);
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

const sha256HashValueToClassAttributeNameAndValue = (
  sha256HashValue: string
): readonly [string, string] => {
  return ["class", sha256HashValueToClassName(sha256HashValue)];
};

const sha256HashValueToClassName = (sha256HashValue: string): string => {
  return "nv_" + sha256HashValue;
};

const sha256HashValueToAnimationName = (sha256HashValue: string): string => {
  return "nva_" + sha256HashValue;
};

const percentageOrRemWidthToCssDeclaration = (
  percentageOrRem: PercentageOrRem
): css.Declaration => {
  if (percentageOrRem.type === "rem") {
    return css.widthRem(percentageOrRem.value);
  }
  return css.widthPercent(percentageOrRem.value);
};

const viewStyleToSha256HashValue = (viewStyle: ViewStyle): string => {
  return createHash("sha256")
    .update(declarationListToString(viewStyle.declarationList))
    .update(declarationListToString(viewStyle.hoverDeclarationList))
    .digest("hex");
};

const keyframeListToSha256HashValue = (
  keyframeList: ReadonlyArray<css.Keyframe>
): string => {
  return createHash("sha256")
    .update(keyframeList.map(css.keyFrameToString).join("!"))
    .digest("hex");
};
