/* eslint-disable */
/* generated by definy. Do not edit! */

import * as a from "https://raw.githubusercontent.com/narumincho/definy/0056123589a92392d4e12dbfafbb815c42ce17f8/deno-lib/definyRpc/core/maybe.ts";
import * as b from "https://raw.githubusercontent.com/narumincho/definy/0056123589a92392d4e12dbfafbb815c42ce17f8/deno-lib/definyRpc/core/request.ts";
import * as c from "https://raw.githubusercontent.com/narumincho/definy/0056123589a92392d4e12dbfafbb815c42ce17f8/deno-lib/definyRpc/core/coreType.ts";

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
   * @default new URL("http://localhost:2520")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<a.Result<string, "error">> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2520"),
    namespace: c.FunctionNamespace.meta,
    name: "name",
    inputType: c.Unit.type(),
    outputType: c.String.type(),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.String",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "String",
          description: "文字列",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.string,
        }),
      ],
      [
        "*coreType.Unit",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.unit,
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
   * @default new URL("http://localhost:2520")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<
  a.Result<globalThis.ReadonlyArray<c.FunctionNamespace>, "error">
> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2520"),
    namespace: c.FunctionNamespace.meta,
    name: "namespaceList",
    inputType: c.Unit.type(),
    outputType: c.List.type(c.FunctionNamespace.type()),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.unit,
        }),
      ],
      [
        "*coreType.List",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "List",
          description: "リスト",
          parameterCount: 1,
          attribute: { type: "nothing" },
          body: c.TypeBody.list,
        }),
      ],
      [
        "*coreType.FunctionNamespace",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "FunctionNamespace",
          description: "出力されるAPI関数のモジュール名",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.sum([
            c.Pattern.from({
              name: "meta",
              description:
                "APIがどんな構造で表現されているかを取得するためのAPI",
              parameter: { type: "nothing" },
            }),
            c.Pattern.from({
              name: "local",
              description: "definy RPC を利用するユーザーが定義したモジュール",
              parameter: { type: "just", value: c.List.type(c.String.type()) },
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
   * @default new URL("http://localhost:2520")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<
  a.Result<globalThis.ReadonlyArray<c.FunctionDetail>, "error">
> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2520"),
    namespace: c.FunctionNamespace.meta,
    name: "functionListByName",
    inputType: c.Unit.type(),
    outputType: c.List.type(c.FunctionDetail.type()),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.unit,
        }),
      ],
      [
        "*coreType.List",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "List",
          description: "リスト",
          parameterCount: 1,
          attribute: { type: "nothing" },
          body: c.TypeBody.list,
        }),
      ],
      [
        "*coreType.FunctionDetail",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "FunctionDetail",
          description: "関数のデータ functionByNameの結果",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.product([
            c.Field.from({
              name: "namespace",
              description: "名前空間",
              type: c.FunctionNamespace.type(),
            }),
            c.Field.from({
              name: "name",
              description: "api名",
              type: c.String.type(),
            }),
            c.Field.from({
              name: "description",
              description: "説明文",
              type: c.String.type(),
            }),
            c.Field.from({
              name: "input",
              description: "入力の型",
              type: c.Type.type(),
            }),
            c.Field.from({
              name: "output",
              description: "出力の型",
              type: c.Type.type(),
            }),
            c.Field.from({
              name: "needAuthentication",
              description: "認証が必要かどうか (キャッシュしなくなる)",
              type: c.Bool.type(),
            }),
            c.Field.from({
              name: "isMutation",
              description: "単なるデータの取得ではなく, 変更するようなものか",
              type: c.Bool.type(),
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
   * @default new URL("http://localhost:2520")
   */
  readonly url?: globalThis.URL | undefined;
  readonly accountToken: AccountToken;
}): globalThis.Promise<
  a.Result<globalThis.ReadonlyArray<c.FunctionDetail>, "error">
> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2520"),
    namespace: c.FunctionNamespace.meta,
    name: "functionListByNamePrivate",
    inputType: c.Unit.type(),
    outputType: c.List.type(c.FunctionDetail.type()),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.unit,
        }),
      ],
      [
        "*coreType.List",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "List",
          description: "リスト",
          parameterCount: 1,
          attribute: { type: "nothing" },
          body: c.TypeBody.list,
        }),
      ],
      [
        "*coreType.FunctionDetail",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "FunctionDetail",
          description: "関数のデータ functionByNameの結果",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.product([
            c.Field.from({
              name: "namespace",
              description: "名前空間",
              type: c.FunctionNamespace.type(),
            }),
            c.Field.from({
              name: "name",
              description: "api名",
              type: c.String.type(),
            }),
            c.Field.from({
              name: "description",
              description: "説明文",
              type: c.String.type(),
            }),
            c.Field.from({
              name: "input",
              description: "入力の型",
              type: c.Type.type(),
            }),
            c.Field.from({
              name: "output",
              description: "出力の型",
              type: c.Type.type(),
            }),
            c.Field.from({
              name: "needAuthentication",
              description: "認証が必要かどうか (キャッシュしなくなる)",
              type: c.Bool.type(),
            }),
            c.Field.from({
              name: "isMutation",
              description: "単なるデータの取得ではなく, 変更するようなものか",
              type: c.Bool.type(),
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
   * @default new URL("http://localhost:2520")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<
  a.Result<globalThis.ReadonlyArray<c.DefinyRpcTypeInfo>, "error">
> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2520"),
    namespace: c.FunctionNamespace.meta,
    name: "typeList",
    inputType: c.Unit.type(),
    outputType: c.List.type(c.DefinyRpcTypeInfo.type()),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.unit,
        }),
      ],
      [
        "*coreType.List",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "List",
          description: "リスト",
          parameterCount: 1,
          attribute: { type: "nothing" },
          body: c.TypeBody.list,
        }),
      ],
      [
        "*coreType.DefinyRpcTypeInfo",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "DefinyRpcTypeInfo",
          description: "definy RPC 型の構造",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.product([
            c.Field.from({
              name: "namespace",
              description: "型が所属する名前空間",
              type: c.Namespace.type(),
            }),
            c.Field.from({
              name: "name",
              description: "型の名前",
              type: c.String.type(),
            }),
            c.Field.from({
              name: "description",
              description: "説明文. コメントなどに出力される",
              type: c.String.type(),
            }),
            c.Field.from({
              name: "parameterCount",
              description:
                "パラメーターの数. パラメーター名やドキュメントはまたいつか復活させる",
              type: c.Number.type(),
            }),
            c.Field.from({
              name: "attribute",
              description: "特殊な扱いをする",
              type: a.Maybe.type(c.TypeAttribute.type()),
            }),
            c.Field.from({
              name: "body",
              description: "型の構造を表現する",
              type: c.TypeBody.type(),
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
   * @default new URL("http://localhost:2520")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<a.Result<string, "error">> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2520"),
    namespace: c.FunctionNamespace.meta,
    name: "generateCallDefinyRpcTypeScriptCode",
    inputType: c.Unit.type(),
    outputType: c.String.type(),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.String",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "String",
          description: "文字列",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.string,
        }),
      ],
      [
        "*coreType.Unit",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.unit,
        }),
      ],
    ]),
  });

/**
 * サーバーが実行している環境でコードを生成し, ファイルとして保存する.
 *  保存先:file:///C:/Users/narum/Documents/GitHub/definy/deno-lib/definyRpc/example/generated/
 */
export const generateCodeAndWriteAsFileInServer = (parameter: {
  /**
   * api end point
   * @default new URL("http://localhost:2520")
   */
  readonly url?: globalThis.URL | undefined;
}): globalThis.Promise<a.Result<undefined, "error">> =>
  b.requestQuery({
    url: parameter.url ?? new globalThis.URL("http://localhost:2520"),
    namespace: c.FunctionNamespace.meta,
    name: "generateCodeAndWriteAsFileInServer",
    inputType: c.Unit.type(),
    outputType: c.Unit.type(),
    input: undefined,
    typeMap: new Map([
      [
        "*coreType.Unit",
        c.DefinyRpcTypeInfo.from({
          namespace: c.Namespace.coreType,
          name: "Unit",
          description: "値が1つだけ",
          parameterCount: 0,
          attribute: { type: "nothing" },
          body: c.TypeBody.unit,
        }),
      ],
    ]),
  });
