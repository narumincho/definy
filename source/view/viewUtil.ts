import * as d from "definy-core/source/data";
import { CSSObject, css } from "@emotion/css";
import {
  Children,
  Color,
  Element,
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
  tag: "div",
  id: idOrUndefined(option.id),
  class: css(option.style),
  children: childrenFromStringOrElementMap(children),
});

export const externalLink = <Message>(
  option: {
    id?: string;
    url: URL;
    style?: CSSObject;
  },
  children: ReadonlyMap<string, Element<Message>> | string
): Element<Message> => ({
  tag: "externalLink",
  id: idOrUndefined(option.id),
  class: css(option.style),
  url: option.url.toString(),
  children: childrenFromStringOrElementMap(children),
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
  tag: "localLink",
  id: idOrUndefined(option.id),
  class: css(option.style),
  url: option.url.toString(),
  jumpMessage: option.jumpMessage,
  children: childrenFromStringOrElementMap(children),
});

export const button = <Message>(
  option: {
    id?: string;
    style?: CSSObject;
    click: Message;
  },
  children: ReadonlyMap<string, Element<Message>> | string
): Element<Message> => ({
  tag: "button",
  id: idOrUndefined(option.id),
  class: css(option.style),
  click: option.click,
  children: childrenFromStringOrElementMap(children),
});

export const img = <Message>(option: {
  id?: string;
  style?: CSSObject;
  alt: string;
  /** 画像のURL. なぜ URL 型にしないかと言うと, BlobURLがURL型に入らないから */
  src: string;
}): Element<Message> => ({
  tag: "img",
  id: idOrUndefined(option.id),
  class: css(option.style),
  alt: option.alt,
  src: option.src,
});

export const inputRadio = <Message>(option: {
  id?: string;
  style?: CSSObject;
  select: Message;
  checked: boolean;
  /** 選択肢の選択を1にする動作のため. どの選択肢に属しているかを指定する */
  groupName: string;
}): Element<Message> => ({
  tag: "inputRadio",
  id: idOrUndefined(option.id),
  class: css(option.style),
  checked: option.checked,
  name: option.groupName,
  select: option.select,
});

export const inputOneLineText = <Message>(option: {
  id?: string;
  style?: CSSObject;
  input: (text: string) => Message;
  value: string;
}): Element<Message> => ({
  tag: "inputText",
  id: idOrUndefined(option.id),
  class: css(option.style),
  value: option.value,
  input: option.input,
});

export const label = (
  option: { id?: string; style?: CSSObject; targetElementId: string },
  children: ReadonlyMap<string, Element<never>> | string
): Element<never> => ({
  tag: "label",
  id: idOrUndefined(option.id),
  class: css(option.style),
  for: option.targetElementId,
  children: childrenFromStringOrElementMap(children),
});

export const svg = <Message>(
  option: {
    id?: string;
    viewBox: { x: number; y: number; width: number; height: number };
    style?: CSSObject;
  },
  children: ReadonlyMap<string, Element<Message>>
): Element<Message> => ({
  tag: "svg",
  id: idOrUndefined(option.id),
  class: css(option.style),
  viewBoxX: option.viewBox.x,
  viewBoxY: option.viewBox.y,
  viewBoxWidth: option.viewBox.width,
  viewBoxHeight: option.viewBox.height,
  children: childrenElementList(children),
});

export const path = <Message>(option: {
  id?: string;
  style?: CSSObject;
  d: string;
  fill: string;
}): Element<Message> => ({
  tag: "path",
  id: idOrUndefined(option.id),
  class: css(option.style),
  d: option.d,
  fill: option.fill,
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
  style?: CSSObject;
  cx: number;
  cy: number;
  fill: string;
  r: number;
  stroke: string;
  animations?: ReadonlyArray<SvgAnimation>;
}): Element<Message> => ({
  tag: "circle",
  id: idOrUndefined(option.id),
  class: css(option.style),
  cx: option.cx,
  cy: option.cy,
  r: option.r,
  fill: option.fill,
  stroke: option.stroke,
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
});

const animate = (svgAnimation: SvgAnimation): Element<never> => ({
  tag: "animate",
  attributeName: svgAnimation.attributeName,
  dur: svgAnimation.dur,
  repeatCount: "indefinite",
  from: svgAnimation.from.toString(),
  to: svgAnimation.to.toString(),
});

const idOrUndefined = (idValue: string | undefined): string =>
  idValue === undefined ? "" : idValue;

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
  bodyClass: css(option.style),
  children: childrenFromStringOrElementMap(children),
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
): Element<Output> => {
  switch (element.tag) {
    case "div":
      return {
        tag: "div",
        id: element.id,
        class: element.class,
        children: childrenMap(element.children, func),
      };
    case "externalLink":
      return {
        tag: "externalLink",
        id: element.id,
        class: element.class,
        url: element.url,
        children: childrenMap(element.children, func),
      };
    case "button":
      return {
        tag: "button",
        id: element.id,
        class: element.class,
        click: func(element.click),
        children: childrenMap(element.children, func),
      };
    case "localLink":
      return {
        tag: "localLink",
        id: element.id,
        class: element.class,
        url: element.url,
        jumpMessage: func(element.jumpMessage),
        children: childrenMap(element.children, func),
      };
    case "img":
      return element;
    case "inputRadio":
      return {
        tag: "inputRadio",
        id: element.id,
        class: element.class,
        name: element.name,
        checked: element.checked,
        select: func(element.select),
      };
    case "inputText":
      return {
        tag: "inputText",
        id: element.id,
        class: element.class,
        value: element.value,
        input: (input: string) => func(element.input(input)),
      };
    case "label":
      return {
        tag: "label",
        id: element.id,
        class: element.class,
        for: element.for,
        children: childrenMap(element.children, func),
      };
    case "svg":
      return {
        tag: "svg",
        id: element.id,
        class: element.class,
        viewBoxX: element.viewBoxX,
        viewBoxY: element.viewBoxY,
        viewBoxWidth: element.viewBoxWidth,
        viewBoxHeight: element.viewBoxHeight,
        children: childrenMap(element.children, func),
      };
    case "path":
      return element;
    case "circle":
      return element;
    case "animate":
      return element;
  }
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
