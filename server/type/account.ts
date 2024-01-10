import * as g from "npm:graphql";
import { DateTime } from "npm:@narumincho/simple-graphql-server-common";
import { AccountId } from "./id.ts";

export type Account = {
  readonly id: AccountId;
  readonly name: string;
  readonly createDateTime: Date;
};

export const Account = new g.GraphQLObjectType({
  name: "Account",
  description: "definy のアカウント",
  fields: {
    id: {
      type: new g.GraphQLNonNull(AccountId),
    },
    name: {
      type: new g.GraphQLNonNull(g.GraphQLString),
      description: "アカウント名. 重複する可能性あり",
    },
    createDateTime: {
      type: new g.GraphQLNonNull(DateTime),
      description: "アカウントが作成された日時",
    },
  },
});
