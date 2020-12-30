import * as d from "definy-core/source/data";
import { CSSObject, css } from "@emotion/css";
import {
  Children,
  Color,
  Element,
  InputMessageData,
  View,
  childrenElementList,
  childrenElementListTag,
  childrenText,
  childrenTextTag,
} from "./view";
import { mapMapValue } from "../util";

export const div = <Message>(
  option: { id?: string; click?: Message; style?: CSSObject },
  children: ReadonlyMap<string, Element<Message>> | string
): Element<Message> => ({
  tagName: "div",
  attributeAndChildren: {
    attributes: new Map<string, string>(
      option.id === undefined ? [] : [["id", option.id]]
    ).set("class", css(option.style)),
    events: {
      onClick:
        option.click === undefined
          ? undefined
          : { message: option.click, ignoreNewTab: false },
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenFromStringOrElementMap(children),
  },
  isSvg: false,
});

export const externalLink = <Message>(
  option: {
    id?: string;
    url: URL;
    style?: CSSObject;
  },
  children: ReadonlyMap<string, Element<Message>> | string
): Element<Message> => ({
  tagName: "a",
  attributeAndChildren: {
    attributes: new Map<string, string>([
      ...(option.id === undefined ? [] : ([["id", option.id]] as const)),
      ["href", option.url.toString()],
      ["class", css(option.style)],
    ]),
    events: {
      onClick: undefined,
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenFromStringOrElementMap(children),
  },
  isSvg: false,
});

export const localLink = <Message>(
  option: {
    id?: string;
    url: URL;
    style?: CSSObject;
    jumpMessage: Message;
  },
  children: ReadonlyMap<string, Element<Message>> | string
): Element<Message> => ({
  tagName: "a",
  attributeAndChildren: {
    attributes: new Map<string, string>([
      ...(option.id === undefined ? [] : ([["id", option.id]] as const)),
      ["href", option.url.toString()],
      ["class", css(option.style)],
    ]),
    events: {
      onClick: { message: option.jumpMessage, ignoreNewTab: true },
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenFromStringOrElementMap(children),
  },
  isSvg: false,
});

export const button = <Message>(
  option: {
    id?: string;
    style?: CSSObject;
    click: Message;
  },
  children: ReadonlyMap<string, Element<Message>> | string
): Element<Message> => ({
  tagName: "button",
  attributeAndChildren: {
    attributes: new Map<string, string>([
      ...(option.id === undefined ? [] : ([["id", option.id]] as const)),
      ["class", css(option.style)],
    ]),
    events: {
      onClick: { message: option.click, ignoreNewTab: true },
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenFromStringOrElementMap(children),
  },
  isSvg: false,
});

export const img = <Message>(option: {
  id?: string;
  style?: CSSObject;
  alt: string;
  /** 画像のURL. なぜ URL 型にしないかと言うと, BlobURLがURL型に入らないから */
  src: string;
}): Element<Message> => ({
  tagName: "img",
  attributeAndChildren: {
    attributes: new Map<string, string>([
      ...(option.id === undefined ? [] : ([["id", option.id]] as const)),
      ["class", css(option.style)],
      ["alt", option.alt],
      ["src", option.src],
    ]),
    events: {
      onClick: undefined,
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenText(""),
  },
  isSvg: false,
});

export const inputRadio = <Message>(option: {
  id?: string;
  style?: CSSObject;
  select: Message;
  checked: boolean;
  /** 選択肢の選択を1にする動作のため. どの選択肢に属しているかを指定する */
  groupName: string;
}): Element<Message> => ({
  tagName: "input",
  attributeAndChildren: {
    attributes: new Map<string, string>([
      ...(option.id === undefined ? [] : ([["id", option.id]] as const)),
      ["class", css(option.style)],
      ...(option.checked ? ([["checked", "checked"]] as const) : []),
      ["name", option.groupName],
    ]),
    events: {
      onClick: undefined,
      onChange: option.select,
      onInput: undefined,
    },
    children: childrenText(""),
  },
  isSvg: false,
});

export const label = (
  option: { id?: string; style?: CSSObject; targetElementId: string },
  children: ReadonlyMap<string, Element<never>> | string
): Element<never> => ({
  tagName: "label",
  attributeAndChildren: {
    attributes: new Map<string, string>([
      ...(option.id === undefined ? [] : ([["id", option.id]] as const)),
      ["class", css(option.style)],
      ["htmlFor", option.targetElementId],
    ]),
    events: {
      onClick: undefined,
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenFromStringOrElementMap(children),
  },
  isSvg: false,
});

export const svg = <Message>(
  option: {
    id?: string;
    viewBox: { x: number; y: number; width: number; height: number };
    style?: CSSObject;
  },
  children: ReadonlyMap<string, Element<Message>> | string
): Element<Message> => ({
  tagName: "svg",
  attributeAndChildren: {
    attributes: new Map<string, string>([
      ...(option.id === undefined ? [] : ([["id", option.id]] as const)),
      [
        "viewBox",
        `${option.viewBox.x} ${option.viewBox.y} ${option.viewBox.width} ${option.viewBox.height}`,
      ],
      ["class", css(option.style)],
    ]),
    events: {
      onClick: undefined,
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenFromStringOrElementMap(children),
  },
  isSvg: true,
});

export const path = <Message>(option: {
  id?: string;
  d: string;
  fill: string;
}): Element<Message> => ({
  tagName: "path",
  attributeAndChildren: {
    attributes: new Map([
      ...(option.id === undefined ? [] : ([["id", option.id]] as const)),
      ["d", option.d],
      ["fill", option.fill],
    ]),
    events: {
      onClick: undefined,
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenText(""),
  },
  isSvg: true,
});

/** SVGの要素のアニメーションを指定する. 繰り返す回数は無限回と指定している */
interface SvgAnimation {
  attributeName: "cy" | "r" | "stroke";
  /** 時間 */
  dur: number;
  /** 開始時の値 */
  from: number | string;
  /** 終了時の値 */
  to: number | string;
}

export const circle = <Message>(option: {
  id?: string;
  cx: number;
  cy: number;
  fill: string;
  r: number;
  stroke: string;
  animations?: ReadonlyArray<SvgAnimation>;
}): Element<Message> => ({
  tagName: "circle",
  attributeAndChildren: {
    attributes: new Map([
      ...(option.id === undefined ? [] : ([["id", option.id]] as const)),
      ["cx", option.cx.toString()],
      ["cy", option.cy.toString()],
      ["fill", option.fill],
      ["r", option.r.toString()],
      ["stroke", option.stroke],
    ]),
    events: {
      onClick: undefined,
      onChange: undefined,
      onInput: undefined,
    },
    children:
      option.animations === undefined
        ? childrenText<never>("")
        : childrenElementList(
            c(
              option.animations.map((animation) => [
                animation.attributeName,
                animate(animation),
              ])
            )
          ),
  },
  isSvg: true,
});

const animate = (svgAnimation: SvgAnimation): Element<never> => ({
  tagName: "animate",
  attributeAndChildren: {
    attributes: new Map([
      ["attributeName", svgAnimation.attributeName],
      ["dur", svgAnimation.dur.toString()],
      ["repeatCount", "indefinite"],
      ["from", svgAnimation.from.toString()],
      ["to", svgAnimation.to.toString()],
    ]),
    events: {
      onClick: undefined,
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenText(""),
  },
  isSvg: true,
});

export const view = <Message>(
  option: {
    readonly title: string;
    readonly themeColor?: Color;
    readonly language: d.Language;
    readonly style?: CSSObject;
  },
  children: ReadonlyMap<string, Element<Message>> | string
): View<Message> => ({
  title: option.title,
  themeColor: option.themeColor,
  language: option.language,
  attributeAndChildren: {
    attributes: new Map([["class", css(option.style)]]),
    events: {
      onClick: undefined,
      onChange: undefined,
      onInput: undefined,
    },
    children: childrenFromStringOrElementMap(children),
  },
});

const childrenFromStringOrElementMap = <Message>(
  children: ReadonlyMap<string, Element<Message>> | string
): Children<Message> =>
  typeof children === "string"
    ? childrenText(children)
    : childrenElementList(children);

export const c = <Message>(
  keyAndElementList: ReadonlyArray<readonly [string, Element<Message>]>
): ReadonlyMap<string, Element<Message>> => new Map(keyAndElementList);

export const fromNever = <Message>(element: Element<never>): Element<Message> =>
  element;

export const elementMap = <Input, Output>(
  element: Element<Input>,
  func: (input: Input) => Output
): Element<Output> => ({
  tagName: element.tagName,
  attributeAndChildren: {
    attributes: element.attributeAndChildren.attributes,
    events: {
      onClick:
        element.attributeAndChildren.events.onClick === undefined
          ? undefined
          : {
              ignoreNewTab:
                element.attributeAndChildren.events.onClick.ignoreNewTab,
              message: func(
                element.attributeAndChildren.events.onClick.message
              ),
            },
      onChange:
        element.attributeAndChildren.events.onChange === undefined
          ? undefined
          : func(element.attributeAndChildren.events.onChange),
      onInput: mapInputMessageData(
        element.attributeAndChildren.events.onInput,
        func
      ),
    },
    children: childrenMap(element.attributeAndChildren.children, func),
  },
  isSvg: element.isSvg,
});

const mapInputMessageData = <InnerMessage, OuterMessage>(
  funcOrUndefined: InputMessageData<InnerMessage> | undefined,
  mapFunc: (old: InnerMessage) => OuterMessage
): InputMessageData<OuterMessage> | undefined => {
  if (funcOrUndefined === undefined) {
    return undefined;
  }
  return (input: string) => mapFunc(funcOrUndefined(input));
};

const childrenMap = <Input, Output>(
  children: Children<Input>,
  func: (input: Input) => Output
): Children<Output> => {
  switch (children.tag) {
    case childrenElementListTag:
      return {
        tag: childrenElementListTag,
        value: mapMapValue(children.value, (element) =>
          elementMap(element, func)
        ),
      };
    case childrenTextTag:
      return children;
  }
};
