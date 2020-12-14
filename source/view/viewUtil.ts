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
import { localEventName } from "./patch";
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
    events: new Map(
      option.click === undefined ? [] : [["click", option.click]]
    ),
    children: childrenFromStringOrElementMap(children),
  },
  isSvg: false,
});

export const externalLink = <Message>(
  option: {
    id?: string;
    url: URL;
    style?: CSSObject;
    isConfirm: boolean;
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
    events: new Map<string, Message>(),
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
    events: new Map<string, Message>([[localEventName, option.jumpMessage]]),
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
    events: new Map<string, Message>(),
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
    events: new Map<string, Message>(),
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
    events: new Map(),
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
    events: mapMapValue(element.attributeAndChildren.events, func),
    children: childrenMap(element.attributeAndChildren.children, func),
  },
  isSvg: element.isSvg,
});

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
