/* eslint-disable init-declarations */

/**
 * The representation of a color.
 * https://pursuit.purescript.org/packages/purescript-colors/5.0.0/docs/Color#t:Color
 */
export type Color = { _color: never };

/**
 * Create a Color from integer RGB values between 0 and 255 and a floating point alpha value between 0.0 and 1.0.
 * https://pursuit.purescript.org/packages/purescript-colors/5.0.0/docs/Color#v:rgba
 *
 * をオブジェクトを受け取るように変更
 */
export declare const colorFrom: (rgba: {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}) => Color;

export type Language = { _language: never };

export declare const japanese: Language;

export declare const english: Language;

export declare const esperanto: Language;

export type Maybe<T> = { _maybe: T };

export declare const just: <T>(a: T) => Maybe<T>;

export declare const nothing: <T>() => Maybe<T>;

/**
 * 空ではない文字列 (基本的にリテラルで指定して!)
 */
export type NonEmptyString = string & { _nonEmpty: never };

export type TwitterCard = { _twitterCard: never };

/* eslint-disable init-declarations */
export type HtmlOption = {
  /**
   * ページ名
   * Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される
   */
  readonly pageName: NonEmptyString;

  /**
   * アプリ名 / サイト名 (HTML出力のみ反映)
   */
  readonly appName: NonEmptyString;

  /**
   * ページの説明 (HTML出力のみ反映)
   */
  readonly description: string;

  /**
   * テーマカラー
   */
  readonly themeColor: Color.Color;

  /**
   * アイコン画像のURL
   */
  readonly iconPath: StructuredUrl.PathAndSearchParams;

  /**
   * 使用している言語
   */
  readonly language: Maybe.Maybe<Language.Language>;

  /**
   * OGPに使われるカバー画像のURL (CORSの制限を受けない)
   */
  readonly coverImagePath: StructuredUrl.PathAndSearchParams;

  /**
   * オリジン
   */
  readonly origin: NonEmptyString;

  /**
   * パス. ログイン時のコールバック時には Noting にして良い
   */
  readonly path: Maybe.Maybe<StructuredUrl.PathAndSearchParams>;

  /**
   * コンテンツ作成者のTwitterID `@`を含む
   */
  readonly creatorTwitterId: Maybe.Maybe<string>;

  /**
   * 全体に適応されるスタイル. CSS
   */
  readonly style: Maybe.Maybe<string>;
  /** *スタイルのパス */
  readonly stylePath: Maybe.Maybe<StructuredUrl.PathAndSearchParams>;
  /** スクリプトのパス */
  readonly scriptPath: Maybe.Maybe<StructuredUrl.PathAndSearchParams>;
  /** body の class */
  readonly bodyClass: Maybe.Maybe<NonEmptyString.NonEmptyString>;
  /** body の 子要素 */
  readonly bodyChildren: Array<never>;
};

export type PathAndSearchParams = {
  _pathAndSearchParams: never;
};

/**
 * パスからURLを指定する. 配列の中身は,空 でない文字列である必要がある
 */
export declare const pathAndSearchParamsFromPath: (
  pathList: ReadonlyArray<string>
) => PathAndSearchParams;

export declare const structuredUrlFromOriginAndPathAndSearchParams: (
  origin: NonEmptyString,
  pathAndSearchParams: PathAndSearchParams
) => StructuredUrl;

export type PackageJsonName = { _packageJsonName: never };

export declare const packageNameFromString: (
  name: NonEmptyString
) => PackageJsonName;

/**
 * packageJson を作成する
 * PureScript 版
 */
export declare const createPackageJson: (option: {
  readonly author: NonEmptyString;
  readonly dependencies: ReadonlyArray<{
    readonly name: string;
    readonly version: string;
  }>;
  readonly description: NonEmptyString;
  readonly entryPoint: NonEmptyString;
  readonly gitHubAccountName: NonEmptyString;
  readonly gitHubRepositoryName: NonEmptyString;
  readonly homepage: StructuredUrl;
  readonly name: PackageJsonName;
  readonly nodeVersion: NonEmptyString;
  readonly typeFilePath: Maybe<NonEmptyString>;
  readonly version: NonEmptyString;
}) => string;

export declare const definyBuild: (option: {
  readonly isDevelopment: boolean;
  readonly origin: NonEmptyString;
}) => void;
