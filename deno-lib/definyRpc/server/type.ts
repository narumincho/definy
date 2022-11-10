import { RawJsonValue } from "../../typedJson.ts";
import { Lazy } from "../../lazy.ts";
import { NonEmptyArray } from "../../util.ts";

export type DefinyRpcType<in out t> = {
  readonly namespace: NonEmptyArray<string>;
  readonly name: string;
  readonly description: string;
  // deno-lint-ignore no-explicit-any
  readonly parameters: ReadonlyArray<DefinyRpcType<any>>;
  readonly body: TypeBody;
  readonly toJson: (x: unknown) => RawJsonValue;
  readonly fromJson: (x: RawJsonValue) => t;
};

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
    readonly type: "stringMap";
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
  };
