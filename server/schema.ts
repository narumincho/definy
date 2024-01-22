import * as g from "npm:graphql";
import { now } from "./query/now.ts";
import { createAccount } from "./mutation/createAccount.ts";
import { accountByCode } from "./query/accountByCode.ts";
import { createTotpKey } from "./mutation/createTotpKey.ts";
import { entities } from "./query/entities.ts";

const query = new g.GraphQLObjectType({
  name: "Query",
  description: "データを取得できる. データを取得するのみで, データを変更しない",
  fields: { now, accountByCode, entities },
});

const mutation = new g.GraphQLObjectType({
  name: "Mutation",
  description: "データを作成、更新ができる",
  fields: { createAccount, createTotpKey },
});

export const schema = new g.GraphQLSchema({
  query,
  mutation,
});
