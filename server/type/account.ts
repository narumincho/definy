import * as g from "npm:graphql";
import { DateTime } from "npm:@narumincho/simple-graphql-server-common@0.1.2";
import { AccountId } from "./id.ts";
import { AccountDisplayName } from "./accountDisplayName.ts";
import { AccountCode } from "./accountCode.ts";
import { Context } from "../context.ts";

export type Account = {
  readonly __typename: "Account";
  readonly id: AccountId;
  readonly code: AccountCode;
  readonly displayName: AccountDisplayName;
  readonly createDateTime: Date;
};

export const Account = new g.GraphQLObjectType<Account, Context>({
  name: "Account",
  description: "definy のアカウント",
  fields: {
    id: {
      type: new g.GraphQLNonNull(AccountId),
    },
    code: {
      type: new g.GraphQLNonNull(AccountCode),
      description:
        "アカウントコード. ある時点では重複はしないが, 永久欠番ではない",
    },
    displayName: {
      type: new g.GraphQLNonNull(AccountDisplayName),
      description: "アカウント名. 重複する可能性あり",
    },
    createDateTime: {
      type: new g.GraphQLNonNull(DateTime),
      description: "アカウントが作成された日時",
    },
  },
});
