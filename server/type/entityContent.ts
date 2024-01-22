import * as g from "npm:graphql";
import { Account } from "./account.ts";

export type EntityContent = Account;

export const EntityContent = new g.GraphQLUnionType({
  name: "EntityContent",
  description:
    "IDが付与されるもの. 例えばアカウントやアイデアなど. 最新かどうかとかはあとで考える",
  types: [Account],
});
