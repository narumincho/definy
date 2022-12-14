/* eslint-disable */
/* generated by definy. Do not edit! */

import * as a from "https://raw.githubusercontent.com/narumincho/definy/aaa899eaa65c13b6eabb9f3f28bc2e01e1f04009/deno-lib/definyRpc/core/coreType.ts";
import * as b from "https://raw.githubusercontent.com/narumincho/definy/aaa899eaa65c13b6eabb9f3f28bc2e01e1f04009/deno-lib/definyRpc/core/request.ts";

/**
 * 認証が必要なリクエストに使用する
 */
export type AccountToken = string & { readonly __accountTokenBland: never };

/**
 * サーバー名の取得
 */
export const name = (parameter: {
  /**
   * api end point
   * @default new URL("http://localhost:2528")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<a.Result<string, "error">> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2528"),
    namespace: a.FunctionNamespace.meta,
    name: "name",
    inputType: a.Unit.type(),
    outputType: a.String.type(),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.String",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "String",
          description: "文字列",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.string,
        }),
      ],
      [
        "*coreType.Unit",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.unit,
        }),
      ],
    ]),
  });

/**
 * get namespace list. namespace は API の公開非公開, コード生成のモジュールを分けるチャンク. JavaScriptのSetの仕様上, オブジェクトのSetはうまく扱えないので List にしている
 */
export const namespaceList = (parameter: {
  /**
   * api end point
   * @default new URL("http://localhost:2528")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<
  a.Result<globalThis.ReadonlyArray<a.FunctionNamespace>, "error">
> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2528"),
    namespace: a.FunctionNamespace.meta,
    name: "namespaceList",
    inputType: a.Unit.type(),
    outputType: a.List.type(a.FunctionNamespace.type()),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.unit,
        }),
      ],
      [
        "*coreType.List",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "List",
          description: "リスト",
          parameter: [
            a.TypeParameterInfo.from({
              name: "element",
              description: "要素の型",
            }),
          ],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.list,
        }),
      ],
      [
        "*coreType.FunctionNamespace",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "FunctionNamespace",
          description: "出力されるAPI関数のモジュール名",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.sum([
            a.Pattern.from({
              name: "meta",
              description:
                "APIがどんな構造で表現されているかを取得するためのAPI",
              parameter: a.Maybe.nothing(),
            }),
            a.Pattern.from({
              name: "local",
              description: "definy RPC を利用するユーザーが定義したモジュール",
              parameter: a.Maybe.just(a.List.type(a.String.type())),
            }),
          ]),
        }),
      ],
    ]),
  });

/**
 * 名前から関数を検索する (公開APIのみ)
 */
export const functionListByName = (parameter: {
  /**
   * api end point
   * @default new URL("http://localhost:2528")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<
  a.Result<globalThis.ReadonlyArray<a.FunctionDetail>, "error">
> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2528"),
    namespace: a.FunctionNamespace.meta,
    name: "functionListByName",
    inputType: a.Unit.type(),
    outputType: a.List.type(a.FunctionDetail.type()),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.unit,
        }),
      ],
      [
        "*coreType.List",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "List",
          description: "リスト",
          parameter: [
            a.TypeParameterInfo.from({
              name: "element",
              description: "要素の型",
            }),
          ],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.list,
        }),
      ],
      [
        "*coreType.FunctionDetail",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "FunctionDetail",
          description: "関数のデータ functionByNameの結果",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.product([
            a.Field.from({
              name: "namespace",
              description: "名前空間",
              type: a.FunctionNamespace.type(),
            }),
            a.Field.from({
              name: "name",
              description: "api名",
              type: a.String.type(),
            }),
            a.Field.from({
              name: "description",
              description: "説明文",
              type: a.String.type(),
            }),
            a.Field.from({
              name: "input",
              description: "入力の型",
              type: a.Type.type(),
            }),
            a.Field.from({
              name: "output",
              description: "出力の型",
              type: a.Type.type(),
            }),
            a.Field.from({
              name: "needAuthentication",
              description: "認証が必要かどうか (キャッシュしなくなる)",
              type: a.Bool.type(),
            }),
            a.Field.from({
              name: "isMutation",
              description: "単なるデータの取得ではなく, 変更するようなものか",
              type: a.Bool.type(),
            }),
          ]),
        }),
      ],
    ]),
  });

/**
 * 名前から関数を検索する (非公開API)
 */
export const functionListByNamePrivate = (parameter: {
  /**
   * api end point
   * @default new URL("http://localhost:2528")
   */
  readonly url?: globalThis.URL | undefined;
  readonly accountToken: AccountToken;
}): globalThis.Promise<
  a.Result<globalThis.ReadonlyArray<a.FunctionDetail>, "error">
> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2528"),
    namespace: a.FunctionNamespace.meta,
    name: "functionListByNamePrivate",
    inputType: a.Unit.type(),
    outputType: a.List.type(a.FunctionDetail.type()),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.unit,
        }),
      ],
      [
        "*coreType.List",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "List",
          description: "リスト",
          parameter: [
            a.TypeParameterInfo.from({
              name: "element",
              description: "要素の型",
            }),
          ],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.list,
        }),
      ],
      [
        "*coreType.FunctionDetail",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "FunctionDetail",
          description: "関数のデータ functionByNameの結果",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.product([
            a.Field.from({
              name: "namespace",
              description: "名前空間",
              type: a.FunctionNamespace.type(),
            }),
            a.Field.from({
              name: "name",
              description: "api名",
              type: a.String.type(),
            }),
            a.Field.from({
              name: "description",
              description: "説明文",
              type: a.String.type(),
            }),
            a.Field.from({
              name: "input",
              description: "入力の型",
              type: a.Type.type(),
            }),
            a.Field.from({
              name: "output",
              description: "出力の型",
              type: a.Type.type(),
            }),
            a.Field.from({
              name: "needAuthentication",
              description: "認証が必要かどうか (キャッシュしなくなる)",
              type: a.Bool.type(),
            }),
            a.Field.from({
              name: "isMutation",
              description: "単なるデータの取得ではなく, 変更するようなものか",
              type: a.Bool.type(),
            }),
          ]),
        }),
      ],
    ]),
    accountToken: parameter.accountToken,
  });

/**
 * 型のリストを返す
 */
export const typeList = (parameter: {
  /**
   * api end point
   * @default new URL("http://localhost:2528")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<
  a.Result<globalThis.ReadonlyArray<a.DefinyRpcTypeInfo>, "error">
> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2528"),
    namespace: a.FunctionNamespace.meta,
    name: "typeList",
    inputType: a.Unit.type(),
    outputType: a.List.type(a.DefinyRpcTypeInfo.type()),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.unit,
        }),
      ],
      [
        "*coreType.List",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "List",
          description: "リスト",
          parameter: [
            a.TypeParameterInfo.from({
              name: "element",
              description: "要素の型",
            }),
          ],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.list,
        }),
      ],
      [
        "*coreType.DefinyRpcTypeInfo",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "DefinyRpcTypeInfo",
          description: "definy RPC 型の構造",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.product([
            a.Field.from({
              name: "namespace",
              description: "型が所属する名前空間",
              type: a.Namespace.type(),
            }),
            a.Field.from({
              name: "name",
              description: "型の名前",
              type: a.String.type(),
            }),
            a.Field.from({
              name: "description",
              description: "説明文. コメントなどに出力される",
              type: a.String.type(),
            }),
            a.Field.from({
              name: "parameter",
              description: "パラメーター",
              type: a.List.type(a.TypeParameterInfo.type()),
            }),
            a.Field.from({
              name: "attribute",
              description: "特殊な扱いをする",
              type: a.Maybe.type(a.TypeAttribute.type()),
            }),
            a.Field.from({
              name: "body",
              description: "型の構造を表現する",
              type: a.TypeBody.type(),
            }),
          ]),
        }),
      ],
    ]),
  });

/**
 * 名前空間「definyRpc」のApiFunctionを呼ぶ TypeScript のコードを生成する
 */
export const generateCallDefinyRpcTypeScriptCode = (parameter: {
  /**
   * api end point
   * @default new URL("http://localhost:2528")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<a.Result<string, "error">> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2528"),
    namespace: a.FunctionNamespace.meta,
    name: "generateCallDefinyRpcTypeScriptCode",
    inputType: a.Unit.type(),
    outputType: a.String.type(),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.String",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "String",
          description: "文字列",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.string,
        }),
      ],
      [
        "*coreType.Unit",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.unit,
        }),
      ],
    ]),
  });

/**
 * サーバーが実行している環境でコードを生成し, ファイルとして保存する.
 *  保存先:file:///C:/Users/narum/Documents/GitHub/definy/deno-lib/definyApp/apiClient/
 */
export const generateCodeAndWriteAsFileInServer = (parameter: {
  /**
   * api end point
   * @default new URL("http://localhost:2528")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<a.Result<undefined, "error">> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2528"),
    namespace: a.FunctionNamespace.meta,
    name: "generateCodeAndWriteAsFileInServer",
    inputType: a.Unit.type(),
    outputType: a.Unit.type(),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        a.DefinyRpcTypeInfo.from({
          namespace: a.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameter: [],
          attribute: a.Maybe.nothing(),
          body: a.TypeBody.unit,
        }),
      ],
    ]),
  });
