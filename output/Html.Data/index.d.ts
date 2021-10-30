import * as Color from "../Color";
import * as Language from "../Language";
import * as Maybe from "../Data.Maybe";
import * as StructuredUrl from "../StructuredUrl";

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
   * Twitter Card. Twitterでシェアしたときの表示をどうするか
   */
  readonly twitterCard: TwitterCard;

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

export declare const SummaryCardWithLargeImage: { readonly value: TwitterCard };
