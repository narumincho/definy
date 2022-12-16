import { createApiFunction, FunctionAndTypeList } from "../core/apiFunction.ts";
import {
  DefinyRpcTypeInfo,
  Field,
  FunctionNamespace,
  Maybe,
  Namespace,
  Number,
  String,
  TypeBody,
  Unit,
} from "../core/coreType.ts";
import { Account } from "./generated/api/main.ts";

export const mainNamespace = FunctionNamespace.local(["main"]);

export const functionAndTypeList = (): FunctionAndTypeList => {
  return {
    typeList: [
      DefinyRpcTypeInfo.from({
        namespace: Namespace.local(["main"]),
        name: "Account",
        description: "アカウント",
        attribute: Maybe.nothing(),
        parameter: [],
        body: TypeBody.product([
          Field.from({
            name: "name",
            description: "アカウント名",
            type: String.type(),
          }),
          Field.from({
            name: "age",
            description: "年齢",
            type: Number.type(),
          }),
        ]),
      }),
    ],
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
      createApiFunction({
        namespace: FunctionNamespace.local(["main"]),
        description: "カスタムAPI Function",
        name: "useCustomType",
        input: Unit.type(),
        output: Account.type(),
        isMutation: false,
        needAuthentication: false,
        resolve: () => {
          return Account.from({
            name: "ラフィーア",
            age: 18,
          });
        },
      }),
    ],
  };
};
