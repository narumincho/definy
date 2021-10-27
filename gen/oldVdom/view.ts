import { Language, TwitterCard } from "./data";

export type View<Message> = {
  /**
   * ページ名
   *
   * Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される
   */
  readonly pageName: string;

  /**
   * アプリ名 / サイト名 (HTML出力のみ反映)
   */
  readonly appName: string;

  /**
   * ページの説明 (HTML出力のみ反映)
   */
  readonly description: string;

  /**
   * テーマカラー
   */
  readonly themeColor: Color | undefined;

  /**
   * アイコン画像のパス. /から始まる必要がある
   */
  readonly iconPath: string;

  /**
   * 使用している言語
   */
  readonly language: Language | undefined;

  /**
   * OGPに使われるカバー画像のURL (CORSの制限を受けない)
   */
  readonly coverImageUrl: URL;

  /** ページのURL */
  readonly url: URL;

  /** マニフェストのパス */
  readonly manifestPath?: ReadonlyArray<string>;

  /** Twitter Card。Twitterでシェアしたときの表示をどうするか */
  readonly twitterCard: TwitterCard;

  /** 全体に適応されるスタイル. CSS */
  readonly style?: string;

  /** スタイルのURL */
  readonly styleUrlList?: ReadonlyArray<URL>;

  /** ES Modules形式のJavaScript */
  readonly script?: string;

  /** メインのスクリプトのパス */
  readonly scriptPath?: string;

  /** スクリプトのURL. 違うオリジンのスクリプトを含めたいときに使う */
  readonly scriptUrlList?: ReadonlyArray<URL>;

  /** body の class */
  readonly bodyClass: string;

  /** 表示領域内でマウスや, タッチが動いたときのメッセージ */
  readonly pointerMove?: (pointer: Pointer) => Message;

  /** 表示領域内でマウスがクリックされたり, 画面に接触したときのメッセージ */
  readonly pointerDown?: (pointer: Pointer) => Message;
  /** body の 子要素 */
  readonly children: Children<Message>;
};

export type Pointer = {
  /** イベントの原因となっているポインタの一意の識別子 */
  pointerId: number;
  /** ポインタの接触ジオメトリの幅 */
  width: number;
  /** ポインタの接触ジオメトリの高さ */
  height: number;
  /** 0 から 1 の範囲のポインタ入力の正規化された圧力。 ここで、0 と 1 は、それぞれハードウェアが検出できる最小圧力と最大圧力を表します。 */
  pressure: number;
  /** ポインタ入力の正規化された接線圧力（バレル圧力またはシリンダー応力（cylinder stress）とも呼ばれます）は -1 から 1 の範囲で、0 はコントロールの中立位置です。 */
  tangentialPressure: number;
  /** Y-Z 平面と、ポインタ（ペン/スタイラスなど）軸と Y 軸の両方を含む平面との間の平面角度（度単位、-90 から 90 の範囲）。 */
  tiltX: number;
  /** X-Z 平面と、ポインタ（ペン/スタイラスなど）軸と X 軸の両方を含む平面との間の平面角度（度単位、-90 から 90 の範囲）。 */
  tiltY: number;
  /** ポインタ（ペン/スタイラスなど）の長軸を中心とした時計回りの回転の度数（0 から 359の範囲の値）。 */
  twist: number;
  /** イベントの原因となったデバイスタイプ（マウス、ペン、タッチなど）を示します。 */
  pointerType: PointerType;
  /** ポインタがこのポインタタイプのプライマリポインタを表すかどうかを示します。 */
  isPrimary: boolean;
  /** 表示領域のX座標 */
  x: number;
  /** 表示領域のY座標 */
  y: number;
};

/** ポインターの種類 */
export type PointerType = "mouse" | "pen" | "touch" | "";

/** メッセージを集計した結果 */
export type MessageData<Message> = {
  readonly messageMap: ReadonlyMap<string, Events<Message>>;
  readonly pointerMove: ((pointer: Pointer) => Message) | undefined;
  readonly pointerDown: ((pointer: Pointer) => Message) | undefined;
};
/**
 * View の 差分データ.
 * イベント関係は差分を使って処理をしないので Message は含まれないが, 要素を追加するときに Message を使う形になってしまっている
 */
export type ViewDiff<Message> = {
  readonly patchOperationList: ReadonlyArray<ViewPatchOperation>;
  readonly childrenDiff: ChildrenDiff<Message>;
  readonly newMessageData: MessageData<Message>;
};

export type ViewPatchOperation =
  | { tag: "changePageName"; newTitle: string }
  | { tag: "changeThemeColor"; newThemeColor: Color | undefined }
  | { tag: "changeLanguage"; newLanguage: Language | undefined }
  | { tag: "changeBodyClass"; newClass: string };

export type Element<Message> =
  | Div<Message>
  | ExternalLink<Message>
  | LocalLink<Message>
  | Button<Message>
  | Img
  | InputRadio<Message>
  | InputText<Message>
  | TextArea<Message>
  | Label<Message>
  | Svg<Message>
  | SvgPath
  | SvgCircle
  | SvgAnimate;

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
    }
  | {
      readonly kind: "skip";
    };

export type ElementUpdateDiff<Message> =
  | DivDiff<Message>
  | ExternalLinkDiff<Message>
  | LocalLinkDiff<Message>
  | ButtonDiff<Message>
  | ImgDiff
  | InputRadioDiff
  | InputTextDiff
  | TextAreaDiff
  | LabelDiff<Message>
  | SvgDiff<Message>
  | SvgPathDiff
  | SvgCircleDiff
  | SvgAnimateDiff;

export type Div<Message> = {
  readonly tag: "div";
  readonly id: string;
  readonly class: string;
  readonly click: ClickMessageData<Message> | null;
  readonly children: Children<Message>;
};

export type DivDiff<Message> = {
  readonly tag: "div";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly children: ChildrenDiff<Message>;
};

export type ExternalLink<Message> = {
  readonly tag: "externalLink";
  readonly id: string;
  readonly class: string;
  readonly url: string;
  readonly children: Children<Message>;
};

export type ExternalLinkDiff<Message> = {
  readonly tag: "externalLink";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly url: string | undefined;
  readonly children: ChildrenDiff<Message>;
};

export type LocalLink<Message> = {
  readonly tag: "localLink";
  readonly id: string;
  readonly class: string;
  readonly url: string;
  readonly jumpMessage: Message;
  readonly children: Children<Message>;
};

export type LocalLinkDiff<Message> = {
  readonly tag: "localLink";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly url: string | undefined;
  readonly children: ChildrenDiff<Message>;
};

export type Button<Message> = {
  readonly tag: "button";
  readonly id: string;
  readonly class: string;
  readonly click: Message;
  readonly children: Children<Message>;
};

export type ButtonDiff<Message> = {
  readonly tag: "button";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly children: ChildrenDiff<Message>;
};

export type Img = {
  readonly tag: "img";
  readonly id: string;
  readonly class: string;
  readonly alt: string;
  readonly src: string;
};

export type ImgDiff = {
  readonly tag: "img";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly alt: string | undefined;
  readonly src: string | undefined;
};

export type InputRadio<Message> = {
  readonly tag: "inputRadio";
  readonly id: string;
  readonly class: string;
  readonly select: Message;
  readonly checked: boolean;
  /** 選択肢の選択を1にする動作のため. どの選択肢に属しているかを指定する */
  readonly name: string;
};

export type InputRadioDiff = {
  readonly tag: "inputRadio";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly checked: boolean | undefined;
  readonly name: string | undefined;
};

export type InputText<Message> = {
  readonly tag: "inputText";
  readonly id: string;
  readonly class: string;
  readonly inputOrReadonly: ((text: string) => Message) | null;
  readonly value: string;
};

export type InputTextDiff = {
  readonly tag: "inputText";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly readonly: boolean | undefined;
  readonly value: string | undefined;
};

export type TextArea<Message> = {
  readonly tag: "textArea";
  readonly id: string;
  readonly class: string;
  readonly inputOrReadonly: ((text: string) => Message) | null;
  readonly value: string;
};

export type TextAreaDiff = {
  readonly tag: "textArea";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly readonly: boolean | undefined;
  readonly value: string | undefined;
};

export type Label<Message> = {
  readonly tag: "label";
  readonly id: string;
  readonly class: string;
  readonly for: string;
  readonly children: Children<Message>;
};

export type LabelDiff<Message> = {
  readonly tag: "label";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly for: string | undefined;
  readonly children: ChildrenDiff<Message>;
};

export type Svg<Message> = {
  readonly tag: "svg";
  readonly id: string;
  readonly class: string;
  readonly viewBoxX: number;
  readonly viewBoxY: number;
  readonly viewBoxWidth: number;
  readonly viewBoxHeight: number;
  readonly children: Children<Message>;
};

export type SvgDiff<Message> = {
  readonly tag: "svg";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly viewBoxX: number | undefined;
  readonly viewBoxY: number | undefined;
  readonly viewBoxWidth: number | undefined;
  readonly viewBoxHeight: number | undefined;
  readonly children: ChildrenDiff<Message>;
};

export type SvgPath = {
  readonly tag: "path";
  readonly id: string;
  readonly class: string;
  readonly d: string;
  readonly fill: string;
};

export type SvgPathDiff = {
  readonly tag: "path";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly d: string | undefined;
  readonly fill: string | undefined;
};

export type SvgCircle = {
  readonly tag: "circle";
  readonly id: string;
  readonly class: string;
  readonly fill: string;
  readonly stroke: string;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly children: Children<never>;
};

export type SvgCircleDiff = {
  readonly tag: "circle";
  readonly id: string | undefined;
  readonly class: string | undefined;
  readonly fill: string | undefined;
  readonly stroke: string | undefined;
  readonly cx: number | undefined;
  readonly cy: number | undefined;
  readonly r: number | undefined;
  readonly children: ChildrenDiff<never>;
};

export type SvgAnimate = {
  readonly tag: "animate";
  readonly attributeName: string;
  readonly dur: number;
  readonly repeatCount: string;
  readonly from: string;
  readonly to: string;
};

export type SvgAnimateDiff = {
  readonly tag: "animate";
  readonly attributeName: string | undefined;
  readonly dur: number | undefined;
  readonly repeatCount: string | undefined;
  readonly from: string | undefined;
  readonly to: string | undefined;
};

/**
 * 各要素のイベントのハンドルをどうするかのデータ
 *
 * Message を undefined にするとイベントが設定されてないと解釈される場合があるので注意!
 */
export type Events<Message> = {
  onClick: ClickMessageData<Message> | undefined;
  onChange: ChangeMessageData<Message> | undefined;
  onInput: InputMessageData<Message> | undefined;
};

export type Path = string & { readonly _path: undefined };

export const rootPath = "" as Path;

export const pathAppendKey = (path: Path, key: string): Path =>
  (path + "/" + key) as Path;

export type ClickMessageData<Message> = {
  ignoreNewTab: boolean;
  stopPropagation: boolean;
  message: Message;
};

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
export type Color = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};
