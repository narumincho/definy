import type { UrlObject } from "url";

/**
 * 構造化され, 単純化されたURL
 */
export type StructuredUrl = {
  /**
   * パス.
   * クエリパラメーターとの違いは, SSG 時にファイルとして残せるレベルの単位 であるということ
   * 使える文字は, 正規表現 `[a-zA-Z0-9_-]` を満たすものに限ってほしいが, チェックはしない
   */
  readonly path: ReadonlyArray<string>;
  /**
   * クエリパラメーター.
   * 検索条件等を入れる.
   * キーにも値にも文字の制限はない. JavaScript の URLSearchParams で 変換される.
   */
  readonly searchParams: ReadonlyMap<string, string>;
};

export const structuredUrlToUrl = (
  origin: string,
  structuredUrl: StructuredUrl
): URL => {
  const url = new URL(origin);
  url.pathname = "/" + structuredUrl.path.join("/");

  if (structuredUrl.searchParams !== undefined) {
    for (const [key, value] of structuredUrl.searchParams) {
      url.searchParams.set(key, value);
    }
  }
  return url;
};

/**
 * Next.js で使ってる. Node の URL. (なんでWebのほうと別にあるんだろう?)
 */
export const structuredUrlToNodeUrlObject = (
  structuredUrl: StructuredUrl
): UrlObject => {
  return {
    pathname: "/" + structuredUrl.path.join("/"),
    query: Object.fromEntries(structuredUrl.searchParams),
  };
};

/**
 * 文字列の(パスと クエリパラメーター)が結合したものから, {@link StructuredUrl} を得る
 *
 * @param pathAndQueryAsString Cloud Functions for Firebase で使われているの express の `request.url`
 * @returns 生成した {@link StructuredUrl}
 */
export const pathAndQueryStringToStructuredUrl = (
  pathAndQueryAsString: string
): StructuredUrl => {
  const url = new URL(`https://narumincho.com/${pathAndQueryAsString}`);
  const pathList = url.pathname.split("/").slice(1);
  return {
    path: pathList,
    searchParams: new Map([...url.searchParams]),
  };
};

/**
 * (文字列のパスと 文字列のクエリパラメーター)から, {@link StructuredUrl} を得る
 *
 * @param pathAsString {@link location.pathname}
 * @param searchParamsAsString {@link location.search}
 * @returns 生成した {@link StructuredUrl}
 */
export const urlToStructuredUrl = (
  pathAsString: string,
  searchParamsAsString: string
): StructuredUrl => {
  const pathList = pathAsString.split("/").slice(1);
  return {
    path: pathList,
    searchParams: new Map([...new URLSearchParams(searchParamsAsString)]),
  };
};
