import { createRandomId } from "npm:@narumincho/simple-graphql-server-common";
import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { Account } from "../type/account.ts";
import { accountIdFrom } from "../type/id.ts";

export const createAccount: g.GraphQLFieldConfig<
  void,
  Context,
  { readonly name: string }
> = {
  args: {
    name: {
      type: new g.GraphQLNonNull(g.GraphQLString),
      description: "アカウント名. 既存のアカウントと名前が重複しても問題ない",
    },
  },
  type: new g.GraphQLNonNull(Account),
  resolve: async (_, args, { denoKv }): Promise<Account> => {
    const accountId = accountIdFrom(createRandomId());
    const createDateTime = new Date();
    await denoKv.set(["account", accountId], {
      name: args.name,
      createDateTime,
    });
    return {
      id: accountId,
      name: args.name,
      createDateTime,
    };
  },
  description: "アカウントを作成する",
};
