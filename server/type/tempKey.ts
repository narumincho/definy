import * as g from "npm:graphql";
import { DateTime } from "npm:@narumincho/simple-graphql-server-common@0.1.2";
import { AccountId, TemporaryKeyId } from "./id.ts";
import { AccountDisplayName } from "./accountDisplayName.ts";
import { AccountCode } from "./accountCode.ts";

export type TemporaryKey = {
  readonly id: TemporaryKeyId;
  readonly secret: string;
};

export const Key = new g.GraphQLObjectType({
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
