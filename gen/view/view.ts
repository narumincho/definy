import { Color } from "../html/main";
import { Language } from "../../localData";

/**
 * 見た目を表現するデータ. HTML Option より HTML と離れた, 抽象度の高く 扱いやすいものにする.
 * Definy と ナルミンチョの創作記録で両方の指定が可能なもの
 */
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
   * アイコン画像のURL
   */
  readonly iconUrl: URL;

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

  /**
   * Web App マニフェストのURL
   *
   * https://developer.mozilla.org/en-US/docs/Web/Manifest
   */
  readonly webAppManifestUrl?: URL;

  /** 全体に適応されるスタイル. CSS */
  readonly style?: string;

  /** スタイルのURL */
  readonly styleUrlList?: ReadonlyArray<URL>;

  /** ES Modules形式のJavaScript */
  readonly script?: string;

  /** スクリプトのURL */
  readonly scriptUrlList?: ReadonlyArray<URL>;

  /** 子要素 */
  readonly box: Box<Message>;
};

/** 縦か横方向に積める箱 */
export type Box<Message> = {
  readonly type: "box";
  readonly direction: "x" | "y";
  readonly children: ReadonlyArray<SizeAndElementOrBox<Message>>;
  readonly gap: number;
  readonly padding: number;
  readonly height: number | undefined;
  readonly backgroundColor: string | undefined;
  readonly url: URL | undefined;
};

export type SizeAndElementOrBox<Message> = {
  readonly size: Size;
  readonly elementOrBox: Element | Box<Message>;
};

export type Size = number | "1fr" | "auto";

export const sizeAndElementOrBox = <Message>(
  size: SizeAndElementOrBox<Message>["size"],
  elementOrBox: Element | Box<Message>
): SizeAndElementOrBox<Message> => {
  return { size, elementOrBox };
};

export type CreateBoxOption = {
  readonly gap?: number;
  readonly padding?: number;
  readonly height?: number;
  /** @example "#7B920A" */
  readonly backgroundColor?: string;
  readonly url?: URL;
};

export const boxX = <Message>(
  option: CreateBoxOption,
  children: ReadonlyArray<SizeAndElementOrBox<Message>>
): Box<Message> => {
  return createBox("x", option, children);
};
export const boxY = <Message>(
  option: CreateBoxOption,
  children: ReadonlyArray<SizeAndElementOrBox<Message>>
): Box<Message> => {
  return createBox("y", option, children);
};

const createBox = <Message>(
  direction: "x" | "y",
  option: CreateBoxOption,
  children: ReadonlyArray<SizeAndElementOrBox<Message>>
): Box<Message> => {
  return {
    type: "box",
    direction,
    gap: option.gap ?? 0,
    padding: option.padding ?? 0,
    height: option.height,
    url: option.url,
    backgroundColor: option.backgroundColor,
    children,
  };
};

/** テキスト, リンクなどの要素 */
export type Element =
  | {
      readonly type: "text";
      readonly markup: "none" | "heading1" | "heading2";
      readonly padding: number;
      readonly text: string;
    }
  | {
      readonly type: "svg";
      readonly svg: Svg;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly type: "image";
      readonly url: URL;
      readonly width: number;
      readonly height: number;
    };

export type Svg = {
  readonly viewBox: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly svgElementList: ReadonlyArray<SvgElement>;
};

export type SvgElement =
  | {
      readonly type: "path";
      readonly pathText: string;
      readonly fill: string;
    }
  | {
      readonly type: "g";
      readonly transform: ReadonlyArray<string>;
      readonly svgElementList: ReadonlyArray<SvgElement>;
    };

export const textElement = (
  option: { padding?: number; markup?: "heading1" | "heading2" },
  text: string
): Element => {
  return {
    type: "text",
    padding: option.padding ?? 0,
    markup: option.markup ?? "none",
    text,
  };
};
export const svgElement = (
  option: { width: number; height: number },
  svg: Svg
): Element => {
  return {
    type: "svg",
    svg,
    width: option.width,
    height: option.height,
  };
};
export const imageElement = (option: {
  readonly url: URL;
  readonly width: number;
  readonly height: number;
}): Element => {
  return {
    type: "image",
    url: option.url,
    width: option.width,
    height: option.height,
  };
};
