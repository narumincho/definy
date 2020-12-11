import * as d from "definy-core/source/data";
import { mapMapValue } from "../util";

export interface View<Message> {
  readonly title: string;
  readonly themeColor: Color | undefined;
  readonly language: d.Language;
  readonly attributeAndChildren: AttributesAndChildren<Message>;
}

export interface Element<Message> {
  readonly tagName: string;
  readonly attributeAndChildren: AttributesAndChildren<Message>;
}

export interface AttributesAndChildren<Message> {
  readonly attributes: ReadonlyMap<string, string>;
  readonly events: ReadonlyMap<string, Message>;
  readonly children: Children<Message>;
}

export const childrenElementListTag = Symbol("Children - ElementList");
export const childrenTextTag = Symbol("Children - Text");

export const childrenElementList = <Message>(
  value: ReadonlyMap<string, Element<Message>>
): Children<Message> => ({ tag: childrenElementListTag, value });

export const childrenText = <Message>(value: string): Children<Message> => ({
  tag: childrenTextTag,
  value,
});

export type Children<Message> =
  | {
      readonly tag: typeof childrenElementListTag;
      readonly value: ReadonlyMap<string, Element<Message>>;
    }
  | {
      readonly tag: typeof childrenTextTag;
      readonly value: string;
    };

/** 色を表現する rgbは 0...1 の範囲でなければならない */
export interface Color {
  r: number;
  g: number;
  b: number;
}

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
