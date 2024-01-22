import * as g from "npm:graphql";
import { EntityContent } from "./entityContent.ts";
import { Context } from "../context.ts";
import { accountIdFrom } from "./id.ts";

export type Entity = {
  readonly id: string;
  readonly content: EntityContent;
};

export const Entity = new g.GraphQLObjectType<Entity, Context>({
  name: "Entity",
  description:
    "IDが付与されるもの. 例えばアカウントやアイデアなど. 最新かどうかとかはあとで考える",
  fields: {
    id: {
      type: new g.GraphQLNonNull(g.GraphQLString),
    },
    content: {
      type: EntityContent,
      resolve: async (
        { id },
        _,
        { kvDataLoader },
      ): Promise<EntityContent | null> => {
        const result = (await kvDataLoader.load(id)).value;
        if (result === null) {
          return null;
        }
        return {
          __typename: "Account",
          id: accountIdFrom(id),
          code: result.code,
          createDateTime: result.createDateTime,
          displayName: result.displayName,
        };
      },
    },
  },
});
