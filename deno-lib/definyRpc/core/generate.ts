import { fromFileUrl } from "https://deno.land/std@0.156.0/path/mod.ts";
import { writeTextFileWithLog } from "../../writeFileAndLog.ts";
import { apiFunctionListToCode } from "../codeGen/main.ts";
import { CollectedDefinyRpcType } from "./collectType.ts";

const string: CollectedDefinyRpcType = {
  namespace: { type: "coreType" },
  name: "String",
  description: "文字列",
  parameterCount: 0,
  body: { type: "string" },
};

const bool: CollectedDefinyRpcType = {
  namespace: { type: "coreType" },
  name: "Bool",
  description: "Bool. boolean. 真偽値. True か False",
  parameterCount: 0,
  body: { type: "boolean" },
};

const number: CollectedDefinyRpcType = {
  namespace: { type: "coreType" },
  name: "Number",
  description: "64bit 浮動小数点数",
  parameterCount: 0,
  body: {
    type: "number",
  },
};

const structuredJsonValue: CollectedDefinyRpcType = ({
  namespace: { type: "coreType" },
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
          name: "StructuredJsonValue",
          namespace: { type: "coreType" },
          parameters: [],
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
          namespace: { type: "coreType" },
          name: number.name,
          parameters: [],
        },
      },
      {
        name: "object",
        description: "object",
        parameter: {
          namespace: { type: "coreType" },
          name: "StringMap",
          parameters: [{
            name: "StructuredJsonValue",
            namespace: { type: "coreType" },
            parameters: [],
          }],
        },
      },
    ],
  },
});

const stringMap: CollectedDefinyRpcType = {
  namespace: { type: "coreType" },
  name: "StringMap",
  description: "キーが string の ReadonlyMap",
  parameterCount: 1,
  body: {
    type: "stringMap",
    valueType: {
      name: "StructuredJsonValue",
      namespace: { type: "coreType" },
      parameters: [],
    },
  },
};

export const generateCoreCode = async (): Promise<void> => {
  const code = apiFunctionListToCode({
    apiFunctionList: [],
    namespace: { type: "coreType" },
    originHint: "",
    pathPrefix: [],
    usePrettier: true,
    typeList: [string, bool, number, structuredJsonValue, stringMap],
  });
  await writeTextFileWithLog(
    fromFileUrl(import.meta.resolve("./generated.ts")),
    code,
  );
};
