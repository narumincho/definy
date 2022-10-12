import { DefinyRpcType } from "./type.ts";
import { NonEmptyArray } from "../../deno-lib/util.ts";

const privateSymbol = Symbol();

/**
 * definy Rpc の内容を構成する関数
 */
export type ApiFunction = {
  readonly fullName: NonEmptyArray<string>;
  // deno-lint-ignore no-explicit-any
  readonly input: DefinyRpcType<any>;
  // deno-lint-ignore no-explicit-any
  readonly output: DefinyRpcType<any>;
  /**
   * 認証が必要かどうか
   * https://narumincho.notion.site/c5cbc02963c24733abe93fcd2fab2b73?v=3ec614a2ca0046c9bae9efbf8c0ea4e3
   */
  readonly needAuthentication: boolean;
  readonly description: string;
  readonly isMutation: boolean;
  readonly resolve: (
    // deno-lint-ignore no-explicit-any
    input: any,
    accountToken: AccountToken | undefined
    // deno-lint-ignore no-explicit-any
  ) => Promise<any> | any;
  readonly [Symbol.toStringTag]: "ApiFunction";
  readonly [privateSymbol]: typeof privateSymbol;
};

export type AccountToken = string & { __accountToken: never };

export const createApiFunction = <
  InputType,
  OutputType,
  NeedAuthentication extends boolean
>(parameter: {
  readonly fullName: NonEmptyArray<string>;
  readonly input: DefinyRpcType<InputType>;
  readonly output: DefinyRpcType<OutputType>;
  /**
   * 認証が必要かどうか
   * https://narumincho.notion.site/c5cbc02963c24733abe93fcd2fab2b73?v=3ec614a2ca0046c9bae9efbf8c0ea4e3
   */
  readonly needAuthentication: NeedAuthentication;
  readonly description: string;
  readonly isMutation: boolean;
  readonly resolve: (
    input: InputType,
    accountToken: NeedAuthentication extends true ? AccountToken : undefined
  ) => Promise<OutputType> | OutputType;
}): ApiFunction => {
  return {
    fullName: parameter.fullName,
    input: parameter.input,
    output: parameter.output,
    needAuthentication: parameter.needAuthentication,
    description: parameter.description,
    isMutation: parameter.isMutation,
    resolve: (input, accountToken) =>
      parameter.resolve(
        input,
        accountToken as NeedAuthentication extends true
          ? AccountToken
          : undefined
      ),
    [Symbol.toStringTag]: "ApiFunction",
    [privateSymbol]: privateSymbol,
  };
};
