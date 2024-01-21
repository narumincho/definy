import * as g from "npm:graphql";
import { TotpKeyId } from "./id.ts";
import { TotpSecret } from "./totpSecret.ts";

export type TotpKeyAndId = {
  readonly id: TotpKeyId;
  readonly secret: TotpSecret;
};

export const TotpKeyAndId = new g.GraphQLObjectType({
  name: "TotpKeyAndId",
  description: "鍵. 新規登録時の一時的に保存する部分で使う",
  fields: {
    id: {
      type: new g.GraphQLNonNull(TotpKeyId),
    },
    secret: {
      type: new g.GraphQLNonNull(TotpSecret),
      description: "生成した鍵. TOTPの生成に使う",
    },
  },
});
