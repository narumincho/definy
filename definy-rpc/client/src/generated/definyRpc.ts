/* eslint-disable */
/* generated by definy. Do not edit! */



/**
 * 取得した結果
 */
export type Result<ok extends unknown, error extends unknown> = { readonly type: "ok"; readonly ok: ok } | { readonly type: "error"; readonly error: error };


/**
 * 認証が必要なリクエストに使用する
 */
export type AccountToken = string & { readonly __accountTokenBland: never };

export declare namespace definyRpc {

/**
 * 内部表現は, undefined. JSON 上では null
 */
export type Unit = undefined;


}export declare namespace definyRpc {

/**
 * 文字列
 */
export type String = string;


}export declare namespace definyRpc {

/**
 * 集合. Set
 */
export type Set<p0 extends unknown> = globalThis.ReadonlySet;


}export declare namespace definyRpc {

/**
 * リスト
 */
export type List<p0 extends unknown> = globalThis.ReadonlyArray;


}export declare namespace definyRpc {

/**
 * functionByNameの結果
 */
export type FunctionDetail = { 
/**
 * 名前空間付き, 関数名
 */
readonly name: definyRpc.List<definyRpc.String>; 
/**
 * 関数の説明文
 */
readonly description: definyRpc.String; 
/**
 * 関数の入力の型
 */
readonly input: definyRpc.Type; 
/**
 * 関数の出力の型
 */
readonly output: definyRpc.Type };


}export declare namespace definyRpc {

/**
 * definyRpc で表現できる型
 */
export type Type = { 
/**
 * 完全名
 */
readonly fullName: definyRpc.List<definyRpc.String>; readonly description: definyRpc.String; 
/**
 * 型パラメーター
 */
readonly parameters: definyRpc.List<definyRpc.Type> };


}
/**
 * definyRpc の ApiFunctions を呼ぶ
 */
export const definyRpc: { 
/**
 * サーバー名の取得
 */
readonly name: (a: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }) => globalThis.Promise<string>; 
/**
 * get namespace list. namespace は API の公開非公開, コード生成のモジュールを分けるチャンク
 */
readonly namespaceList: (a: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }) => globalThis.Promise<globalThis.Set<undefined>>; 
/**
 * 名前から関数を検索する (公開APIのみ)
 */
readonly functionListByName: (a: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }) => globalThis.Promise<globalThis.ReadonlyArray<undefined>>; 
/**
 * 名前から関数を検索する (非公開API)
 */
readonly functionListByNamePrivate: (a: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined; readonly accountToken: AccountToken }) => globalThis.Promise<globalThis.ReadonlyArray<undefined>>; 
/**
 * 名前空間「definyRpc」のApiFunctionを呼ぶ TypeScript のコードを生成する
 */
readonly generateCallDefinyRpcTypeScriptCode: (a: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }) => globalThis.Promise<string>; 
/**
 * サーバーが実行している環境でコードを生成し, ファイルとして保存する
 */
readonly generateCodeAndWriteAsFileInServer: (a: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }) => globalThis.Promise<undefined> } = { name: (parameter: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }): globalThis.Promise<string> => {
  const url: globalThis.URL = new globalThis.URL(parameter.origin ?? "http://localhost:2520");
  url.pathname = "/definyRpc/name";
  return globalThis.fetch(url).then((response: globalThis.Response): globalThis.Promise<string> => (response.json())).then((jsonValue: unknown): string => {
    if (typeof jsonValue === "string") {
      return jsonValue;
    }
    throw new Error("parseError");
  }).catch((): globalThis.Promise<string> => {

  });
}, namespaceList: (parameter: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }): globalThis.Promise<globalThis.Set<undefined>> => {
  const url: globalThis.URL = new globalThis.URL(parameter.origin ?? "http://localhost:2520");
  url.pathname = "/definyRpc/namespaceList";
  return globalThis.fetch(url).then((response: globalThis.Response): globalThis.Promise<string> => (response.json())).then((jsonValue: unknown): globalThis.Set<undefined> => {
    if (typeof jsonValue === "string") {
      return jsonValue;
    }
    throw new Error("parseError");
  }).catch((): globalThis.Promise<globalThis.Set<undefined>> => {

  });
}, functionListByName: (parameter: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }): globalThis.Promise<globalThis.ReadonlyArray<undefined>> => {
  const url: globalThis.URL = new globalThis.URL(parameter.origin ?? "http://localhost:2520");
  url.pathname = "/definyRpc/functionListByName";
  return globalThis.fetch(url).then((response: globalThis.Response): globalThis.Promise<string> => (response.json())).then((jsonValue: unknown): globalThis.ReadonlyArray<undefined> => {
    if (typeof jsonValue === "string") {
      return jsonValue;
    }
    throw new Error("parseError");
  }).catch((): globalThis.Promise<globalThis.ReadonlyArray<undefined>> => {

  });
}, functionListByNamePrivate: (parameter: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined; readonly accountToken: AccountToken }): globalThis.Promise<globalThis.ReadonlyArray<undefined>> => {
  const url: globalThis.URL = new globalThis.URL(parameter.origin ?? "http://localhost:2520");
  url.pathname = "/definyRpc/functionListByNamePrivate";
  return globalThis.fetch(url, { headers: { authorization: parameter.accountToken } }).then((response: globalThis.Response): globalThis.Promise<string> => (response.json())).then((jsonValue: unknown): globalThis.ReadonlyArray<undefined> => {
    if (typeof jsonValue === "string") {
      return jsonValue;
    }
    throw new Error("parseError");
  }).catch((): globalThis.Promise<globalThis.ReadonlyArray<undefined>> => {

  });
}, generateCallDefinyRpcTypeScriptCode: (parameter: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }): globalThis.Promise<string> => {
  const url: globalThis.URL = new globalThis.URL(parameter.origin ?? "http://localhost:2520");
  url.pathname = "/definyRpc/generateCallDefinyRpcTypeScriptCode";
  return globalThis.fetch(url).then((response: globalThis.Response): globalThis.Promise<string> => (response.json())).then((jsonValue: unknown): string => {
    if (typeof jsonValue === "string") {
      return jsonValue;
    }
    throw new Error("parseError");
  }).catch((): globalThis.Promise<string> => {

  });
}, generateCodeAndWriteAsFileInServer: (parameter: { 
/**
 * api end point
 *   @default http://localhost:2520
 */
readonly origin?: string | undefined }): globalThis.Promise<undefined> => {
  const url: globalThis.URL = new globalThis.URL(parameter.origin ?? "http://localhost:2520");
  url.pathname = "/definyRpc/generateCodeAndWriteAsFileInServer";
  return globalThis.fetch(url).then((response: globalThis.Response): globalThis.Promise<string> => (response.json())).then((jsonValue: unknown): undefined => {
    if (typeof jsonValue === "string") {
      return jsonValue;
    }
    throw new Error("parseError");
  }).catch((): globalThis.Promise<undefined> => {

  });
} };


