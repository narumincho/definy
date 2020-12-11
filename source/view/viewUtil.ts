import * as d from "definy-core/source/data";
import { CSSObject, css } from "@emotion/css";
import {
  Color,
  Element,
  View,
  childrenElementList,
  childrenText,
} from "./view";
import { Map, OrderedMap } from "immutable";

export const div = <Message>(
  option: { id?: string; click?: Message; style?: CSSObject },
  children: OrderedMap<string, Element<Message>> | string
): Element<Message> => ({
  tagName: "div",
  attributeAndChildren: {
    attributes: Map({
      ...(option.id === undefined ? {} : { id: option.id }),
      class: css(option.style),
    }),
    events: Map({
      ...(option.click === undefined ? {} : { click: option.click }),
    }),
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
  children: OrderedMap<string, Element<Message>> | string
): View<Message> => ({
  title: option.title,
  themeColor: option.themeColor,
  language: option.language,
  attributeAndChildren: {
    attributes: Map(),
    events: Map(),
    children:
      typeof children === "string"
        ? childrenText(children)
        : childrenElementList(children),
  },
});
