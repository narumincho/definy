import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { AccountCode } from "../type/accountCode.ts";
import { Account } from "../type/account.ts";
import { AccountId } from "../type/id.ts";
import { cacheAccountByCodeKey, CacheAccountByCodeValue } from "../kv.ts";

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
    const accountId = (await denoKv.get<CacheAccountByCodeValue>(
      cacheAccountByCodeKey(args.code),
    )).value;
    if (accountId === null) {
      throw new Error("アカウントが見つかりませんでした");
    }
    return { id: accountId };
  },
};
