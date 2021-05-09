export type htmlOption = {
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

  /** ES Modules形式のJavaScript */
  readonly script?: string;

  /** スクリプトのURL */
  readonly scriptUrlList?: ReadonlyArray<URL>;

  /** body の class */
  readonly bodyClass?: string;

  /** body の 子要素 */
  readonly children: ReadonlyArray<HtmlElement>;
};

/** 色を表現する rgbは 0...1 の範囲でなければならない */
export type Color = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

/**
 * ナルミンチョが使う言語
 */
export type Language = "Japanese" | "English" | "Esperanto";

/** Twitter Card。Twitterでシェアしたときの表示をどうするか */
export type TwitterCard = "SummaryCard" | "SummaryCardWithLargeImage";

/**
 * @narumincho/htmlにないHTML要素を使いたいときに使うもの。
 * 低レベルAPI
 * @param name 要素名
 * @param attributes 属性
 * @param children 子要素
 */
export const htmlElement = (
  name: string,
  attributes: ReadonlyMap<string, string | null>,
  children: ReadonlyArray<HtmlElement> | string
): HtmlElement => ({
  name,
  attributes,
  children:
    typeof children === "string"
      ? { tag: "text", text: children }
      : { tag: "elementList", value: children },
});

/**
 * エスケープしないカスタマイズ要素。低レベルAPI
 * ```html
 * <script type="x-shader/x-vertex">
 * attribute vec3 position;
 * uniform   mat4 mvpMatrix;
 *
 * void main(void) {
 *     gl_Position = mvpMatrix * vec4(position, 1.0);
 * }
 * </script>
 * ```
 * @param name 要素名
 * @param attributes 属性
 * @param text エスケープしないテキスト
 */
export const htmlElementRawText = (
  name: string,
  attributes: ReadonlyMap<string, string | null>,
  text: string
): HtmlElement => ({
  name,
  attributes,
  children: {
    tag: "rawText",
    text,
  },
});

/**
 * 閉じタグがないカスタマイズ要素。低レベルAPI
 * `<meta name="rafya">`
 * @param name 要素名
 * @param attributes 属性
 */
export const htmlElementNoEndTag = (
  name: string,
  attributes: ReadonlyMap<string, string | null>
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
  /**
   * 属性名は正しい必要がある。
   * value=nullの意味は、属性値がないということ。
   * `<button disabled>`
   */
  readonly attributes: ReadonlyMap<string, string | null>;
  /**
   * 子の要素
   * `<path d="M1,2 L20,53"/>`のような閉じカッコの省略はしない
   */
  readonly children: HtmlChildren;
};

/**
 * 子要素のパターン。パターンマッチングのみに使う
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
