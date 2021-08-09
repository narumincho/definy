/**
 * 見た目を表現するデータ. HTML Option より HTML と離れた, 抽象度の高く 扱いやすいものにする
 */
export type View = {
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

  /** 背景色を黒にするかどうか */
  readonly isBackgroundColorBlack?: boolean;
};

/** 色 rgb それぞれ 0 ～ 1 */
export type Color = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

/**
 * ナルミンチョが使う言語
 */
export type Language = "Japanese" | "English" | "Esperanto";
