import { fromFileUrl } from "https://deno.land/std@0.156.0/path/mod.ts";
import { writeTextFileWithLog } from "../../writeFileAndLog.ts";
import { apiFunctionListToCode } from "../codeGen/main.ts";
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
  TypeBody,
} from "./coreType.ts";

const string = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "String",
  description: "文字列",
  parameterCount: 0,
  body: TypeBody.string,
});

const bool = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Bool",
  description: "Bool. boolean. 真偽値. True か False",
  parameterCount: 0,
  body: TypeBody.boolean,
});

const number = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Number",
  description: "64bit 浮動小数点数",
  parameterCount: 0,
  body: TypeBody.number,
});

const structuredJsonValue = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "StructuredJsonValue",
  description: "構造化されたJSON",
  parameterCount: 0,
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
  parameterCount: 1,
  body: TypeBody.list,
});

const map = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Map",
  description: "辞書型. Map, Dictionary",
  parameterCount: 2,
  body: TypeBody.map,
});

const nameSpace = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "Namespace",
  description: "名前空間. ユーザーが生成するものがこっちが用意するものか",
  parameterCount: 0,
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
  parameterCount: 0,
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
      name: "parameterCount",
      description: "パラメーターの数. パラメーター名やドキュメントはまたいつか復活させる",
      type: Type.from({
        namespace: Namespace.coreType,
        name: "Number",
        parameters: [],
      }),
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

const typeBody = DefinyRpcTypeInfo.from({
  namespace: Namespace.coreType,
  name: "TypeBody",
  description: "型の構造を表現する",
  parameterCount: 0,
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
  parameterCount: 0,
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
  parameterCount: 0,
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
  parameterCount: 0,
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

export const generateCoreCode = async (): Promise<void> => {
  const code = apiFunctionListToCode({
    apiFunctionList: [],
    namespace: Namespace.coreType,
    originHint: "",
    pathPrefix: [],
    usePrettier: true,
    typeList: [
      string,
      bool,
      number,
      structuredJsonValue,
      list,
      map,
      nameSpace,
      definyRpcTypeInfo,
      typeBody,
      field,
      pattern,
      type,
    ],
  });
  await writeTextFileWithLog(
    fromFileUrl(import.meta.resolve("./coreTypeNew.ts")),
    code,
  );
};
