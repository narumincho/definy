import { createRandomId } from "npm:@narumincho/simple-graphql-server-common@0.1.2";
import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { TOTP } from "https://deno.land/x/totp@1.0.1/mod.ts";
import { TotpKeyAndId } from "../type/totpKeyAndId.ts";
import { totpKeyIdIdFrom } from "../type/id.ts";
import { totpSecretFrom } from "../type/totpSecret.ts";

export const createTotpKey: g.GraphQLFieldConfig<
  void,
  Context,
  {}
> = {
  args: {},
  type: new g.GraphQLNonNull(TotpKeyAndId),
  resolve: async (_, __, { denoKv }): Promise<TotpKeyAndId> => {
    const key = totpSecretFrom(
      await TOTP.exportKey(await TOTP.generateKey(32)),
    );
    const id = totpKeyIdIdFrom(crypto.randomUUID().replaceAll("-", ""));
    await denoKv.set(["temporaryTotpKey", id], key, {
      expireIn:
        // 30min
        30 * 60 * 1000,
    });
    return {
      id,
      secret: key,
    };
  },
  description: "TOTPのキーを生成してデータベースに保存する",
};
