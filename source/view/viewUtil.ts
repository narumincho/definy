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
  tagName: "div",
  attributeAndChildren: {
    attributes: new Map<string, string>(
      option.id === undefined ? [] : [["id", option.id]]
    ).set("class", css(option.style)),
    events: new Map(
      option.click === undefined ? [] : [["click", option.click]]
    ),
    children:
      typeof children === "string"
        ? childrenText(children)
        : childrenElementList(children),
  },
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
    children:
      typeof children === "string"
        ? childrenText(children)
        : childrenElementList(children),
  },
});

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
