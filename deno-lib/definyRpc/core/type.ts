import { Lazy } from "../../lazy.ts";
import { namespaceToString } from "../codeGen/namespace.ts";
import { Namespace, StructuredJsonValue } from "./coreType.ts";

export type DefinyRpcType<in out t> = {
  readonly namespace: Namespace;
  readonly name: string;
  readonly description: string;
  // deno-lint-ignore no-explicit-any
  readonly parameters: ReadonlyArray<DefinyRpcType<any>>;
  readonly body: TypeBody;
  readonly toStructuredJsonValue: (x: unknown) => StructuredJsonValue;
  readonly fromStructuredJsonValue: (x: StructuredJsonValue) => t;
};

/**
 * zod 的な 型の参照ではなく型の表現を含めた参照. 削除したい
 */
export type TypeBody =
  | {
    readonly type: "string";
  }
  | {
    readonly type: "number";
  }
  | {
    readonly type: "boolean";
  }
  | {
    readonly type: "unit";
  }
  | {
    readonly type: "list";
  }
  | {
    readonly type: "set";
  }
  | {
    readonly type: "map";
    readonly valueType: Lazy<DefinyRpcType<any>>;
  }
  | {
    readonly type: "product";
    readonly fieldList: ReadonlyArray<{
      readonly name: string;
      readonly description: string;
      // deno-lint-ignore no-explicit-any
      readonly type: Lazy<DefinyRpcType<any>>;
    }>;
  }
  | {
    readonly type: "sum";
    readonly patternList: ReadonlyArray<{
      readonly name: string;
      readonly description: string;
      // deno-lint-ignore no-explicit-any
      readonly parameter: Lazy<DefinyRpcType<any>> | undefined;
    }>;
  }
  | {
    readonly type: "url";
  };

export const definyRpcTypeToMapKey = <t>(type: DefinyRpcType<t>): string => {
  return namespaceToString(type.namespace) + "." + type.name;
};
