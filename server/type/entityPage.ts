import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { Cursor } from "./cursor.ts";
import { Account } from "./account.ts";
import { Entity } from "./entity.ts";

export type EntityPage = {
  readonly data: ReadonlyArray<Entity>;
  readonly nextCursor: Cursor | null;
};

export const EntityPage = new g.GraphQLObjectType<Account, Context>({
  name: "EntityPage",
  description: "Entityのページ",
  fields: () => ({
    data: {
      description: "データのリスト",
      type: new g.GraphQLNonNull(
        new g.GraphQLList(new g.GraphQLNonNull(Entity)),
      ),
    },
    nextCursor: {
      description:
        "次のページのカーソル. nullの場合は次のページがないことを表す",
      type: Cursor,
    },
  }),
});
