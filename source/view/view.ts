import * as d from "definy-core/source/data";

export interface View<Message> {
  readonly title: string;
  readonly themeColor: Color | undefined;
  readonly language: d.Language;
  readonly attributeAndChildren: AttributesAndChildren<Message>;
}

export interface Element<Message> {
  readonly tagName: string;
  readonly attributeAndChildren: AttributesAndChildren<Message>;
  readonly isSvg: boolean;
}

export interface AttributesAndChildren<Message> {
  readonly attributes: ReadonlyMap<string, string>;
  readonly events: Events<Message>;
  readonly children: Children<Message>;
}

/**
 * 各要素のイベントのハンドルをどうするかのデータ
 *
 * Message を undefined にするとイベントが設定されてないと解釈される場合があるので注意!
 */
export interface Events<Message> {
  onClick: ClickMessageData<Message> | undefined;
  onChange: ChangeMessageData<Message> | undefined;
  onInput: InputMessageData<Message> | undefined;
}

export type Path = string & { readonly _path: undefined };

export const rootPath = "" as Path;

export const pathAppendKey = (path: Path, key: string): Path =>
  (path + "/" + key) as Path;

export interface ClickMessageData<Message> {
  ignoreNewTab: boolean;
  message: Message;
}

export type ChangeMessageData<Message> = Message;

export type InputMessageData<Message> = (value: string) => Message;

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
  readonly r: number;
  readonly g: number;
  readonly b: number;
}
