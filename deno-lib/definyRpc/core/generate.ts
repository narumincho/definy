import { fromFileUrl } from "https://deno.land/std@0.156.0/path/mod.ts";
import { writeTextFileWithLog } from "../../writeFileAndLog.ts";
import { apiFunctionListToCode } from "../codeGen/main.ts";
import { CollectedDefinyRpcType } from "./collectType.ts";
import { Namespace } from "./coreType.ts";

const string: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "String",
  description: "文字列",
  parameterCount: 0,
  body: { type: "string" },
};

const bool: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "Bool",
  description: "Bool. boolean. 真偽値. True か False",
  parameterCount: 0,
  body: { type: "boolean" },
};

const number: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "Number",
  description: "64bit 浮動小数点数",
  parameterCount: 0,
  body: {
    type: "number",
  },
};

const structuredJsonValue: CollectedDefinyRpcType = ({
  namespace: Namespace.coreType,
  name: "StructuredJsonValue",
  description: "構造化されたJSON",
  parameterCount: 0,
  body: {
    type: "sum",
    patternList: [
      {
        name: "string",
        description: "string",
        parameter: {
          namespace: string.namespace,
          name: string.name,
          parameters: [],
        },
      },
      {
        name: "array",
        description: "array",
        parameter: {
          name: "List",
          namespace: Namespace.coreType,
          parameters: [{
            name: "StructuredJsonValue",
            namespace: Namespace.coreType,
            parameters: [],
          }],
        },
      },
      {
        name: "boolean",
        description: "boolean",
        parameter: {
          namespace: bool.namespace,
          name: bool.name,
          parameters: [],
        },
      },
      {
        name: "null",
        description: "null",
        parameter: undefined,
      },
      {
        name: "number",
        description: "number",
        parameter: {
          namespace: Namespace.coreType,
          name: number.name,
          parameters: [],
        },
      },
      {
        name: "object",
        description: "object",
        parameter: {
          namespace: Namespace.coreType,
          name: "Map",
          parameters: [{
            name: "String",
            namespace: Namespace.coreType,
            parameters: [],
          }, {
            name: "StructuredJsonValue",
            namespace: Namespace.coreType,
            parameters: [],
          }],
        },
      },
    ],
  },
});

const list: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "List",
  description: "リスト",
  parameterCount: 1,
  body: {
    type: "list",
  },
};

const map: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "Map",
  description: "辞書型. Map, Dictionary",
  parameterCount: 2,
  body: {
    type: "map",
  },
};

const nameSpace: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "Namespace",
  description: "名前空間. ユーザーが生成するものがこっちが用意するものか",
  parameterCount: 0,
  body: {
    type: "sum",
    patternList: [{
      name: "local",
      description: "ユーザーが作ったAPIがあるところ",
      parameter: {
        namespace: Namespace.coreType,
        name: "List",
        parameters: [{
          namespace: Namespace.coreType,
          name: "String",
          parameters: [],
        }],
      },
    }, {
      name: "coreType",
      description: "definyRpc 共通で使われる型",
      parameter: undefined,
    }, {
      name: "typedJson",
      description: "型安全なJSONのコーデック",
      parameter: undefined,
    }, {
      name: "request",
      description: "HTTP経路でAPI呼ぶときに使うコード",
      parameter: undefined,
    }, {
      name: "maybe",
      description: "MaybeとResultがある (一時的対処. coreTypeに入れたい)",
      parameter: undefined,
    }, {
      name: "meta",
      description: "各サーバーにアクセスし型情報を取得する",
      parameter: undefined,
    }],
  },
};

const definyRpcTypeInfo: CollectedDefinyRpcType = {
  name: "DefinyRpcTypeInfo",
  namespace: Namespace.coreType,
  description: "definy RPC 型の構造",
  parameterCount: 0,
  body: {
    type: "product",
    fieldList: [
      {
        name: "namespace",
        description: "型が所属する名前空間",
        type: {
          namespace: Namespace.coreType,
          name: "Namespace",
          parameters: [],
        },
      },
      {
        name: "name",
        description: "型の名前",
        type: {
          namespace: Namespace.coreType,
          name: "String",
          parameters: [],
        },
      },
      {
        name: "description",
        description: "説明文. コメントなどに出力される",
        type: {
          namespace: Namespace.coreType,
          name: "String",
          parameters: [],
        },
      },
      {
        name: "parameterCount",
        description: "パラメーターの数. パラメーター名やドキュメントはまたいつか復活させる",
        type: {
          namespace: Namespace.coreType,
          name: "Number",
          parameters: [],
        },
      },
      {
        name: "body",
        description: "型の構造を表現する",
        type: {
          namespace: Namespace.coreType,
          name: "TypeBody",
          parameters: [],
        },
      },
    ],
  },
};

const typeBody: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "TypeBody",
  description: "型の構造を表現する",
  parameterCount: 0,
  body: {
    type: "sum",
    patternList: [
      {
        name: "string",
        description: "string",
        parameter: undefined,
      },
      {
        name: "number",
        description: "number",
        parameter: undefined,
      },
      {
        name: "boolean",
        description: "boolean",
        parameter: undefined,
      },
      {
        name: "unit",
        description: "unit",
        parameter: undefined,
      },
      {
        name: "list",
        description: "list",
        parameter: undefined,
      },
      {
        name: "set",
        description: "set",
        parameter: undefined,
      },
      {
        name: "map",
        description: "map",
        parameter: undefined,
      },
      {
        name: "url",
        description: "url",
        parameter: undefined,
      },
      {
        name: "product",
        description: "product",
        parameter: {
          namespace: Namespace.coreType,
          name: "List",
          parameters: [
            {
              namespace: Namespace.coreType,
              name: "Field",
              parameters: [],
            },
          ],
        },
      },
      {
        name: "sum",
        description: "sum",
        parameter: {
          namespace: Namespace.coreType,
          name: "List",
          parameters: [{
            namespace: Namespace.coreType,
            name: "Pattern",
            parameters: [],
          }],
        },
      },
    ],
  },
};

const field: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "Field",
  description: "product 直積型で使う",
  parameterCount: 0,
  body: {
    type: "product",
    fieldList: [{
      name: "name",
      description: "フィールド名",
      type: {
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      },
    }, {
      name: "description",
      description: "フィールドの説明",
      type: {
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      },
    }, {
      name: "type",
      description: "型",
      type: {
        namespace: Namespace.coreType,
        name: "Type",
        parameters: [],
      },
    }],
  },
};

const pattern: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "Pattern",
  description: "直和型の表現",
  parameterCount: 0,
  body: {
    type: "product",
    fieldList: [
      {
        name: "name",
        description: "パターン名",
        type: {
          namespace: Namespace.coreType,
          name: "String",
          parameters: [],
        },
      },
      {
        name: "description",
        description: "説明",
        type: {
          namespace: Namespace.coreType,
          name: "String",
          parameters: [],
        },
      },
      {
        name: "parameter",
        description: "パラメーター",
        type: {
          namespace: Namespace.maybe,
          name: "Maybe",
          parameters: [{
            namespace: Namespace.coreType,
            name: "Type",
            parameters: [],
          }],
        },
      },
    ],
  },
};

const type: CollectedDefinyRpcType = {
  namespace: Namespace.coreType,
  name: "Type",
  description: "型",
  parameterCount: 0,
  body: {
    type: "product",
    fieldList: [{
      name: "namespace",
      description: "名前空間",
      type: {
        namespace: Namespace.coreType,
        name: "Namespace",
        parameters: [],
      },
    }, {
      name: "name",
      description: "型の名前",
      type: {
        namespace: Namespace.coreType,
        name: "String",
        parameters: [],
      },
    }, {
      name: "parameters",
      description: "型パラメータ",
      type: {
        namespace: Namespace.coreType,
        name: "List",
        parameters: [
          {
            namespace: Namespace.coreType,
            name: "Type",
            parameters: [],
          },
        ],
      },
    }],
  },
};

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
