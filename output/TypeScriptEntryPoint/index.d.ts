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

export type StructuredUrl = {
  _structuredUrl: never;
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

export declare const languageToIdString: (language: Language) => string;

export declare const englishId: string;
export declare const japaneseId: string;
export declare const esperantoId: string;

export declare const pngMimeType: string;
