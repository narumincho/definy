import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { Cursor } from "./cursor.ts";
import { Account } from "./account.ts";

export type EntityPage = {
  readonly data: ReadonlyArray<EntityPage>;
  readonly nextCursor: Cursor | null;
};

export const EntityPage = new g.GraphQLObjectType<Account, Context>({
  name: "EntityPage",
  description: "Entityのページ",
  fields: () => ({
    data: {
      description: "データのリスト",
      type: new g.GraphQLNonNull(
        new g.GraphQLList(new g.GraphQLNonNull(Account)),
      ),
    },
    nextCursor: {
      description:
        "次のページのカーソル. nullの場合は次のページがないことを表す",
      type: Cursor,
    },
  }),
});
