import * as d from "definy-core/source/data";

export interface View<Message> {
  readonly title: string;
  readonly themeColor: Color | undefined;
  readonly language: d.Language;
  readonly bodyClass: string;
  readonly children: Children<Message>;
}

export interface ViewDiff<Message> {
  readonly newTitle: string | undefined;
  readonly newThemeColor: d.Maybe<Color | undefined>;
  readonly newLanguage: d.Language | undefined;
  readonly newBodyClass: string | undefined;
  readonly childrenDiff: ChildrenDiff<Message>;
  readonly newMessageDataMap: ReadonlyMap<Path, Events<Message>>;
}

export type Element<Message> =
  | Div<Message>
  | ExternalLink<Message>
  | LocalLink<Message>
  | Button<Message>
  | Img
  | InputRadio<Message>
  | InputText<Message>
  | Label<Message>
  | Svg<Message>
  | SvgPath
  | SvgCircle
  | Animate;

export type ElementDiff<Message> =
  | {
      readonly kind: "replace";
      readonly newElement: Element<Message>;
      readonly key: string;
    }
  | {
      readonly kind: "update";
      readonly elementUpdateDiff: ElementUpdateDiff<Message>;
      readonly key: string;
    }
  | {
      readonly kind: "delete";
    }
  | {
      readonly kind: "insert";
      readonly element: Element<Message>;
      readonly key: string;
    };

export type ElementUpdateDiff<Message> =
  | DivDiff<Message>
  | ExternalLinkDiff<Message>
  | LocalLinkDiff<Message>
  | ButtonDiff<Message>
  | ImgDiff
  | InputRadioDiff
  | InputTextDiff
  | LabelDiff<Message>
  | SvgDiff<Message>
  | SvgPathDiff
  | SvgCircleDiff
  | AnimateDiff;

export interface Div<Message> {
  readonly tag: "div";
  readonly id: string;
  readonly class: string;
  readonly children: Children<Message>;
}

export interface DivDiff<Message> {
  readonly tag: "div";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly children: ChildrenDiff<Message>;
}

export interface ExternalLink<Message> {
  readonly tag: "externalLink";
  readonly id: string;
  readonly class: string;
  readonly url: string;
  readonly children: Children<Message>;
}

export interface ExternalLinkDiff<Message> {
  readonly tag: "externalLink";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly url: string | undefined;
  readonly children: ChildrenDiff<Message>;
}

export interface LocalLink<Message> {
  readonly tag: "localLink";
  readonly id: string;
  readonly class: string;
  readonly url: string;
  readonly jumpMessage: Message;
  readonly children: Children<Message>;
}

export interface LocalLinkDiff<Message> {
  readonly tag: "localLink";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly url: string | undefined;
  readonly children: ChildrenDiff<Message>;
}

export interface Button<Message> {
  readonly tag: "button";
  readonly id: string;
  readonly class: string;
  readonly click: Message;
  readonly children: Children<Message>;
}

export interface ButtonDiff<Message> {
  readonly tag: "button";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly children: ChildrenDiff<Message>;
}

export interface Img {
  readonly tag: "img";
  readonly id: string;
  readonly class: string;
  readonly alt: string;
  readonly src: string;
}

export interface ImgDiff {
  readonly tag: "img";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly alt: string | undefined;
  readonly src: string | undefined;
}

export interface InputRadio<Message> {
  readonly tag: "inputRadio";
  readonly id: string;
  readonly class: string;
  readonly select: Message;
  readonly checked: boolean;
  /** 選択肢の選択を1にする動作のため. どの選択肢に属しているかを指定する */
  readonly name: string;
}

export interface InputRadioDiff {
  readonly tag: "inputRadio";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly checked: boolean | undefined;
  readonly name: string | undefined;
}

export interface InputText<Message> {
  readonly tag: "inputText";
  readonly id: string;
  readonly class: string;
  readonly input: (text: string) => Message;
  readonly value: string;
}

export interface InputTextDiff {
  readonly tag: "inputText";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly value: string | undefined;
}

export interface Label<Message> {
  readonly tag: "label";
  readonly id: string;
  readonly class: string;
  readonly for: string;
  readonly children: Children<Message>;
}

export interface LabelDiff<Message> {
  readonly tag: "label";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly for: string | undefined;
  readonly children: ChildrenDiff<Message>;
}

export interface Svg<Message> {
  readonly tag: "svg";
  readonly id: string;
  readonly class: string;
  readonly viewBoxX: number;
  readonly viewBoxY: number;
  readonly viewBoxWidth: number;
  readonly viewBoxHeight: number;
  readonly children: Children<Message>;
}

export interface SvgDiff<Message> {
  readonly tag: "svg";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly viewBoxX: number | undefined;
  readonly viewBoxY: number | undefined;
  readonly viewBoxWidth: number | undefined;
  readonly viewBoxHeight: number | undefined;
  readonly children: ChildrenDiff<Message>;
}

export interface SvgPath {
  readonly tag: "path";
  readonly id: string;
  readonly class: string;
  readonly d: string;
  readonly fill: string;
}

export interface SvgPathDiff {
  readonly tag: "path";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly d: string | undefined;
  readonly fill: string | undefined;
}

export interface SvgCircle {
  readonly tag: "circle";
  readonly id: string;
  readonly class: string;
  readonly fill: string;
  readonly stroke: string;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly children: Children<never>;
}

export interface SvgCircleDiff {
  readonly tag: "circle";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly fill: string | undefined;
  readonly stroke: string | undefined;
  readonly cx: number | undefined;
  readonly cy: number | undefined;
  readonly r: number | undefined;
  readonly children: ChildrenDiff<never>;
}

export interface Animate {
  readonly tag: "animate";
  readonly attributeName: string;
  readonly dur: number;
  readonly repeatCount: string;
  readonly from: string;
  readonly to: string;
}

export interface AnimateDiff {
  readonly tag: "animate";
  readonly attributeName: string | undefined;
  readonly dur: number | undefined;
  readonly repeatCount: string | undefined;
  readonly from: string | undefined;
  readonly to: string | undefined;
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

export type ChildrenDiff<Message> =
  | {
      readonly kind: "skip";
    }
  | {
      readonly kind: "setText";
      readonly text: string;
    }
  | {
      readonly kind: "resetAndInsert";
      readonly value: ReadonlyMap<string, Element<Message>>;
    }
  | {
      readonly kind: "childDiffList";
      readonly children: ReadonlyArray<ElementDiff<Message>>;
    };

/** 色を表現する rgbは 0...1 の範囲でなければならない */
export interface Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}
