import * as d from "definy-core/source/data";
import { CSSObject, css } from "@emotion/css";
import {
  Color,
  Element,
  View,
  childrenElementList,
  childrenText,
} from "./view";

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
  },
  children: ReadonlyMap<string, Element<Message>> | string
): View<Message> => ({
  title: option.title,
  themeColor: option.themeColor,
  language: option.language,
  attributeAndChildren: {
    attributes: new Map(),
    events: new Map(),
    children:
      typeof children === "string"
        ? childrenText(children)
        : childrenElementList(children),
  },
});
