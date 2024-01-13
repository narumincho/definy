import { createRandomId } from "npm:@narumincho/simple-graphql-server-common@0.1.2";
import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { Account } from "../type/account.ts";
import { accountIdFrom } from "../type/id.ts";
import { AccountCode } from "../type/accountCode.ts";
import { AccountDisplayName } from "../type/accountDisplayName.ts";
import { getAccountByCodeResolve } from "../query/accountByCode.ts";

export const createAccount: g.GraphQLFieldConfig<
  void,
  Context,
  { readonly code: AccountCode; readonly displayName: AccountDisplayName }
> = {
  args: {
    code: {
      type: new g.GraphQLNonNull(AccountCode),
      description: "アカウントコード. 既存のアカウントと重複してはいけない",
    },
    displayName: {
      type: AccountDisplayName,
      description: "アカウントの表示名",
    },
  },
  type: new g.GraphQLNonNull(Account),
  resolve: async (_, args, { denoKv }): Promise<Account> => {
    const existingAccountId = getAccountByCodeResolve({
      code: args.code,
      denoKv,
    });
    const displayName = AccountDisplayName.parseValue(
      args.displayName || args.code,
    );
    const accountId = accountIdFrom(createRandomId());
    const createDateTime = new Date();
    await denoKv.set(["account", accountId], {
      code: args.code,
      displayName,
      createDateTime,
    });
    await denoKv.set(["cache", "accountByCode", args.code], accountId);
    return {
      id: accountId,
      code: args.code,
      displayName: displayName,
      createDateTime,
    };
  },
  description: "アカウントを作成する",
};
