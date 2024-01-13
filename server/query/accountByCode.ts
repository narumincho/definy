import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { AccountCode } from "../type/AccountCode.ts";
import { Account } from "../type/account.ts";
import { AccountId } from "../type/id.ts";

export const accountByCode: g.GraphQLFieldConfig<
  void,
  Context,
  { readonly code: AccountCode }
> = {
  args: {
    code: {
      type: new g.GraphQLNonNull(AccountCode),
      description: "アカウントコード",
    },
  },
  description: "",
  type: Account,
  resolve: async (_, args, { denoKv }): Promise<{ readonly id: AccountId }> => {
    const accountId = await getAccountByCodeResolve({ code: args.code, denoKv })
    if (accountId === null) {
      throw new Error("アカウントが見つかりませんでした");
    }
    return { id: accountId };
  },
};

export const getAccountByCodeResolve =async (parameter: {readonly code: AccountCode, readonly  denoKv: Deno.Kv}): Promise<AccountId | null> => {
  return (await parameter.denoKv.get<AccountId>([
    "cache",
    "accountByCode", 
    parameter.code,    
  ])).value;
 
}