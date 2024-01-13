import { createRandomId } from "npm:@narumincho/simple-graphql-server-common@0.1.2";
import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { TOTP } from "https://deno.land/x/totp@1.0.1/mod.ts";
import { TemporaryKey } from "../type/tempKey.ts";
import { temporaryKeyIdFrom } from "../type/id.ts";

export const createPreAccount: g.GraphQLFieldConfig<
  void,
  Context,
  {}
> = {
  args: {},
  type: new g.GraphQLNonNull(g.GraphQLString),
  resolve: async (_, __, { denoKv }): Promise<TemporaryKey> => {
    const key = await TOTP.exportKey(await TOTP.generateKey(32));
    const id = temporaryKeyIdFrom(createRandomId());
    await denoKv.set(["temporaryKey", id], key, { expireIn:
        // 30min
         30 * 60 * 1000, });
    return {
        id,
        secret: key,
    };
  },
  description: "TOTPのキーを生成して",
};
