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

export const generateCoreCode = async (): Promise<void> => {
  const code = apiFunctionListToCode({
    apiFunctionList: [],
    namespace: Namespace.coreType,
    originHint: "",
    pathPrefix: [],
    usePrettier: true,
    typeList: [string, bool, number, structuredJsonValue, list, map, nameSpace],
  });
  await writeTextFileWithLog(
    fromFileUrl(import.meta.resolve("./coreTypeNew.ts")),
    code,
  );
};
