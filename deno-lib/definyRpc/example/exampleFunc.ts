import { createApiFunction, FunctionAndTypeList } from "../core/apiFunction.ts";
import { FunctionNamespace, Number, String, Unit } from "../core/coreType.ts";

export const mainNamespace = FunctionNamespace.local(["main"]);

export const funcList = (): FunctionAndTypeList => {
  return {
    typeList: [],
    functionsList: [
      createApiFunction({
        namespace: mainNamespace,
        name: "hello",
        description: "hello と挨拶が返ってくる",
        needAuthentication: false,
        isMutation: false,
        input: Unit.type(),
        output: String.type(),
        resolve: () => {
          return "hello";
        },
      }),
      createApiFunction({
        namespace: mainNamespace,
        name: "now",
        description: "現在時刻を文字列で返す",
        needAuthentication: false,
        isMutation: false,
        input: Unit.type(),
        output: String.type(),
        resolve: () => {
          return new Date().toISOString();
        },
      }),
      createApiFunction({
        namespace: mainNamespace,
        name: "repeat",
        description: '"ok"を指定した回数分繰り返して返す',
        needAuthentication: false,
        isMutation: false,
        input: Number.type(),
        output: String.type(),
        resolve: (input) => {
          return "ok".repeat(input);
        },
      }),
    ],
  };
};
