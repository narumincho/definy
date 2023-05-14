import { Language } from "../zodType.ts";

export type HtmlOption = {
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

  /**
   * ページのURL. できれば指定して欲しいが, ログインコールバックURLの場合など, OGP を使わないなら `undefined` を指定する
   */
  readonly url: URL | undefined;

  /** Twitter Card。Twitterでシェアしたときの表示をどうするか */
  readonly twitterCard: TwitterCard;

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

  /** スクリプトのURL */
  readonly scriptUrlList?: ReadonlyArray<URL>;

  /** body の class */
  readonly bodyClass?: string;

  /** body の 子要素 */
  readonly children: ReadonlyArray<HtmlElement>;
};

export type Color = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

/** Twitter Card。Twitterでシェアしたときの表示をどうするか */
export type TwitterCard = "SummaryCard" | "SummaryCardWithLargeImage";

export const htmlElement = (
  name: string,
  attributes: ReadonlyMap<string, string | null>,
  children: ReadonlyArray<HtmlElement> | string,
): HtmlElement => ({
  name,
  attributes,
  children: typeof children === "string"
    ? { tag: "text", text: children }
    : { tag: "elementList", value: children },
});

export const htmlElementRawText = (
  name: string,
  attributes: ReadonlyMap<string, string | null>,
  text: string,
): HtmlElement => ({
  name,
  attributes,
  children: {
    tag: "rawText",
    text,
  },
});

export const htmlElementNoEndTag = (
  name: string,
  attributes: ReadonlyMap<string, string | null>,
): HtmlElement => ({
  name,
  attributes,
  children: {
    tag: "noEndTag",
  },
});

/**
 * HtmlElement
 */
export type HtmlElement = {
  /**
   * 要素名 `h1` や `div` など
   */
  readonly name: string;
  readonly attributes: ReadonlyMap<string, string | null>;
  readonly children: HtmlChildren;
};

/**
 * HtmlElementの 子要素
 */
export type HtmlChildren =
  | {
    readonly tag: "elementList";
    readonly value: ReadonlyArray<HtmlElement>;
  }
  | {
    readonly tag: "text";
    readonly text: string;
  }
  | {
    readonly tag: "rawText";
    readonly text: string;
  }
  | {
    readonly tag: "noEndTag";
  };
