import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { Account } from "../type/account.ts";
import { AccountId } from "../type/id.ts";
import { ClientKey } from "../type/clientKey.ts";
import {
  cacheAccountByClientKeyKey,
  CacheAccountByClientKeyValue,
} from "../kv.ts";

export const accountByClientKey: g.GraphQLFieldConfig<
  void,
  Context,
  Record<never, never>
> = {
  args: {},
  description:
    "端末キーから対応するアカウントを取得する. 自分自身の取得. 端末キーは Authorization ヘッダーに指定する",
  type: Account,
  resolve: async (_, args, { denoKv }): Promise<{ readonly id: AccountId }> => {
    const accountId = (await denoKv.get<CacheAccountByClientKeyValue>(
      cacheAccountByClientKeyKey(args.clientKey),
    )).value;
    if (accountId === null) {
      throw new Error("アカウントが見つかりませんでした");
    }
    return { id: accountId };
  },
};
