import * as g from "npm:graphql";
import { now } from "./query/now.ts";

const query = new g.GraphQLObjectType({
  name: "Query",
  description: "データを取得できる. データを取得するのみで, データを変更しない",
  fields: { now },
});

const mutation = new g.GraphQLObjectType({
  name: "Mutation",
  description: "データを作成、更新ができる",
  fields: { now },
});

export const schema = new g.GraphQLSchema({
  query,
  mutation,
});
