import * as g from "npm:graphql";
import { AccountId, TotpKeyId } from "./id.ts";
import { AccountCode } from "./accountCode.ts";
import { TotpSecret } from "./totpSecret.ts";

export type TotpKeyAndId = {
  readonly id: TotpKeyId;
  readonly secret: TotpSecret;
};

export const TotpKeyAndId = new g.GraphQLObjectType({
  name: "TotpKey",
  description: "鍵",
  fields: {
    id: {
      type: new g.GraphQLNonNull(AccountId),
    },
    secret: {
      type: new g.GraphQLNonNull(AccountCode),
      description: "生成した鍵. TOTPの生成に使う",
    },
  },
});
