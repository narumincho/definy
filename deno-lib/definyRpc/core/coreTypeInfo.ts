import {
  Bool,
  DefinyRpcTypeInfo,
  Field,
  List,
  Namespace,
  Pattern,
  String,
  StructuredJsonValue,
  Type,
  TypeAttribute,
  TypeBody,
  TypeParameterInfo,
} from "./coreType.ts";
import { Maybe } from "./maybe.ts";

const string = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "String",
  description: "文字列",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.string,
});

const bool = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Bool",
  description: "Bool. boolean. 真偽値. True か False",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.boolean,
});

const number = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Number",
  description: "64bit 浮動小数点数",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.number,
});

const unit = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Unit",
  description: "値が1つだけ",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.unit,
});

const structuredJsonValue = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "StructuredJsonValue",
  description: "構造化されたJSON",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.sum([
    Pattern.from({
      name: "string",
      description: "string",
      parameter: {
        type: "just",
        value: String.type(),
      },
    }),
    Pattern.from({
      name: "array",
      description: "array",
      parameter: {
        type: "just",
        value: List.type(StructuredJsonValue.type()),
      },
    }),
    Pattern.from({
      name: "boolean",
      description: "boolean",
      parameter: {
        type: "just",
        value: Bool.type(),
      },
    }),
    Pattern.from({
      name: "null",
      description: "null",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "number",
      description: "number",
      parameter: {
        type: "just",
        value: Type.from({
          namespace: Namespace.coreType,
          name: number.name,
          parameters: [],
        }),
      },
    }),
    Pattern.from({
      name: "object",
      description: "object",
      parameter: {
        type: "just",
        value: Type.from({
          namespace: Namespace.coreType,
          name: "Map",
          parameters: [
            Type.from({
              name: "String",
              namespace: Namespace.coreType,
              parameters: [],
            }),
            Type.from({
              name: "StructuredJsonValue",
              namespace: Namespace.coreType,
              parameters: [],
            }),
          ],
        }),
      },
    }),
  ]),
});

const list = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "List",
  description: "リスト",
  parameter: [TypeParameterInfo.from({
    name: "element",
    description: "要素の型",
  })],
  attribute: { type: "nothing" },
  body: TypeBody.list,
});

const map = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Map",
  description: "辞書型. Map, Dictionary",
  parameter: [
    TypeParameterInfo.from({
      name: "key",
      description: "キーの型",
    }),
    TypeParameterInfo.from({
      name: "value",
      description: "値の型",
    }),
  ],
  attribute: { type: "nothing" },
  body: TypeBody.map,
});

const set = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Set",
  description: "Set. 集合",
  parameter: [TypeParameterInfo.from({
    name: "element",
    description: "集合に含まれる要素の型",
  })],
  attribute: { type: "nothing" },
  body: TypeBody.set,
});

const maybe = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Maybe",
  description: "",
  parameter: [
    TypeParameterInfo.from({ name: "element", description: "justのときに入る値の型" }),
  ],
  attribute: { type: "nothing" },
  body: TypeBody.sum([
    Pattern.from({
      name: "just",
      description: "",
      parameter: {
        type: "just",
        value: Type.from({
          namespace: Namespace.coreType,
          name: "element",
          parameters: [],
        }),
      },
    }),
    Pattern.from({
      name: "nothing",
      description: "",
      parameter: { type: "nothing" },
    }),
  ]),
});

const result = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Result",
  description: "",
  parameter: [
    TypeParameterInfo.from({ name: "ok", description: "okのときに入る値" }),
    TypeParameterInfo.from({ name: "error", description: "errorのときに入る値の型" }),
  ],
  attribute: { type: "nothing" },
  body: TypeBody.sum([
    Pattern.from({
      name: "ok",
      description: "",
      parameter: {
        type: "just",
        value: Type.from({
          namespace: Namespace.coreType,
          name: "ok",
          parameters: [],
        }),
      },
    }),
    Pattern.from({
      name: "error",
      description: "",
      parameter: {
        type: "just",
        value: Type.from({
          namespace: Namespace.coreType,
          name: "error",
          parameters: [],
        }),
      },
    }),
  ]),
});

const nameSpace = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Namespace",
  description: "名前空間. ユーザーが生成するものがこっちが用意するものか",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.sum([
    Pattern.from({
      name: "local",
      description: "ユーザーが作ったAPIがあるところ",
      parameter: {
        type: "just",
        value: Type.from({
          namespace: Namespace.coreType,
          name: "List",
          parameters: [Type.from({
            namespace: Namespace.coreType,
            name: "String",
            parameters: [],
          })],
        }),
      },
    }),
    Pattern.from({
      name: "coreType",
      description: "definyRpc 共通で使われる型",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "typedJson",
      description: "型安全なJSONのコーデック",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "request",
      description: "HTTP経路でAPI呼ぶときに使うコード",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "maybe",
      description: "MaybeとResultがある (一時的対処. coreTypeに入れたい)",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "meta",
      description: "各サーバーにアクセスし型情報を取得する",
      parameter: { type: "nothing" },
    }),
  ]),
});

const definyRpcTypeInfo = DefinyRpcTypeInfo.from({
  name: "DefinyRpcTypeInfo",
  namespace: Namespace.coreType,
  description: "definy RPC 型の構造",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.product([
    Field.from({
      name: "namespace",
      description: "型が所属する名前空間",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "Namespace",
        parameters: [],
      }),
    }),
    Field.from({
      name: "name",
      description: "型の名前",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      }),
    }),
    Field.from({
      name: "description",
      description: "説明文. コメントなどに出力される",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      }),
    }),
    Field.from({
      name: "parameter",
      description: "パラメーター",
      type: List.type(Type.from({
        namespace: Namespace.coreType,
        name: "TypeParameterInfo",
        parameters: [],
      })),
    }),
    Field.from({
      name: "attribute",
      description: "特殊な扱いをする",
      type: Maybe.type(Type.from({
        namespace: Namespace.coreType,
        name: "TypeAttribute",
        parameters: [],
      })),
    }),
    Field.from({
      name: "body",
      description: "型の構造を表現する",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "TypeBody",
        parameters: [],
      }),
    }),
  ]),
});

const typeParameterInfo = DefinyRpcTypeInfo.from({
  name: "TypeParameterInfo",
  description: "型パラメータ名と説明文",
  namespace: Namespace.coreType,
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.product([
    Field.from({
      name: "name",
      description: "型パラメーター名",
      type: String.type(),
    }),
    Field.from({
      name: "description",
      description: "型パラメーター説明",
      type: String.type(),
    }),
  ]),
});

const typeAttribute = DefinyRpcTypeInfo.from({
  name: "TypeAttribute",
  description: "型をどのような特殊な扱いをするかどうか",
  namespace: Namespace.coreType,
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.sum([
    Pattern.from({
      name: "asType",
      description: "型のデータ. 型パラメータを付与する",
      parameter: { type: "nothing" },
    }),
  ]),
});

const typeBody = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "TypeBody",
  description: "型の構造を表現する",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.sum([
    Pattern.from({
      name: "string",
      description: "string",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "number",
      description: "number",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "boolean",
      description: "boolean",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "unit",
      description: "unit",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "list",
      description: "list",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "set",
      description: "set",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "map",
      description: "map",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "url",
      description: "url",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "product",
      description: "product",
      parameter: {
        type: "just",
        value: Type.from({
          namespace: Namespace.coreType,
          name: "List",
          parameters: [
            Type.from({
              namespace: Namespace.coreType,
              name: "Field",
              parameters: [],
            }),
          ],
        }),
      },
    }),
    Pattern.from({
      name: "sum",
      description: "sum",
      parameter: {
        type: "just",
        value: Type.from({
          namespace: Namespace.coreType,
          name: "List",
          parameters: [Type.from({
            namespace: Namespace.coreType,
            name: "Pattern",
            parameters: [],
          })],
        }),
      },
    }),
  ]),
});

const field = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Field",
  description: "product 直積型で使う",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.product([
    Field.from({
      name: "name",
      description: "フィールド名",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      }),
    }),
    Field.from({
      name: "description",
      description: "フィールドの説明",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      }),
    }),
    Field.from({
      name: "type",
      description: "型",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "Type",
        parameters: [],
      }),
    }),
  ]),
});

const pattern = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Pattern",
  description: "直和型の表現",
  parameter: [],
  attribute: { type: "nothing" },
  body: TypeBody.product([
    Field.from({
      name: "name",
      description: "パターン名",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      }),
    }),
    Field.from({
      name: "description",
      description: "説明",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      }),
    }),
    Field.from({
      name: "parameter",
      description: "パラメーター",
      type: Type.from({
        namespace: Namespace.maybe,
        name: "Maybe",
        parameters: [Type.from({
          namespace: Namespace.coreType,
          name: "Type",
          parameters: [],
        })],
      }),
    }),
  ]),
});

const type = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Type",
  description: "型",
  parameter: [],
  attribute: { type: "just", value: TypeAttribute.asType },
  body: TypeBody.product([
    Field.from({
      name: "namespace",
      description: "名前空間",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "Namespace",
        parameters: [],
      }),
    }),
    Field.from({
      name: "name",
      description: "型の名前",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      }),
    }),
    Field.from({
      name: "parameters",
      description: "型パラメータ",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "List",
        parameters: [
          Type.from({
            namespace: Namespace.coreType,
            name: "Type",
            parameters: [],
          }),
        ],
      }),
    }),
  ]),
});

const functionNamespace = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  description: "出力されるAPI関数のモジュール名",
  parameter: [],
  attribute: { type: "nothing" },
  name: "FunctionNamespace",
  body: TypeBody.sum([
    Pattern.from({
      name: "meta",
      description: "APIがどんな構造で表現されているかを取得するためのAPI",
      parameter: { type: "nothing" },
    }),
    Pattern.from({
      name: "local",
      description: "definy RPC を利用するユーザーが定義したモジュール",
      parameter: { type: "just", value: List.type(String.type()) },
    }),
  ]),
});

const functionDetail = DefinyRpcTypeInfo.from({
  name: "FunctionDetail",
  description: "関数のデータ functionByNameの結果",
  parameter: [],
  attribute: { type: "nothing" },
  namespace: Namespace.coreType,
  body: TypeBody.product([
    Field.from({
      name: "namespace",
      description: "名前空間",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "FunctionNamespace",
        parameters: [],
      }),
    }),
    Field.from({
      name: "name",
      description: "api名",
      type: String.type(),
    }),
    Field.from({
      name: "description",
      description: "説明文",
      type: String.type(),
    }),
    Field.from({
      name: "input",
      description: "入力の型",
      type: Type.type(),
    }),
    Field.from({
      name: "output",
      description: "出力の型",
      type: Type.type(),
    }),
    Field.from({
      name: "needAuthentication",
      description: "認証が必要かどうか (キャッシュしなくなる)",
      type: Bool.type(),
    }),
    Field.from({
      name: "isMutation",
      description: "単なるデータの取得ではなく, 変更するようなものか",
      type: Bool.type(),
    }),
  ]),
});

/**
 * `./coreType.ts` で定義する型
 */
export const coreTypeInfoList: ReadonlyArray<DefinyRpcTypeInfo> = [
  string,
  unit,
  bool,
  number,
  structuredJsonValue,
  list,
  map,
  set,
  maybe,
  result,
  nameSpace,
  definyRpcTypeInfo,
  typeParameterInfo,
  typeAttribute,
  typeBody,
  field,
  pattern,
  type,
  functionNamespace,
  functionDetail,
];
