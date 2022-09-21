import { DefinyRpcType } from "./type.ts";
import { NonEmptyArray } from "./util.ts";

export type ApiFunction<
  InputType,
  OutputType,
  NeedAuthentication extends boolean
> = {
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
  readonly [Symbol.toStringTag]: "ApiFunction";
};

export type AccountToken = string & { __accountToken: never };

export const createApiFunction = <
  InputType,
  OutputType,
  NeedAuthentication extends boolean
>(
  parameter: Omit<
    ApiFunction<InputType, OutputType, NeedAuthentication>,
    typeof Symbol.toStringTag
  >
): ApiFunction<InputType, OutputType, NeedAuthentication> => {
  return {
    ...parameter,
    [Symbol.toStringTag]: "ApiFunction",
  };
};
