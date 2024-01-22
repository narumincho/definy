import * as g from "npm:graphql";
import { Entity } from "../type/entity.ts";
import { Context } from "../context.ts";
import { entityKeyPrefix, EntityValue, pickEntityKeyId } from "../kv.ts";
import { Cursor, cursorFrom } from "../type/cursor.ts";
import { EntityPage } from "../type/entityPage.ts";

export const entities: g.GraphQLFieldConfig<
  undefined,
  Context,
  {
    readonly cursor: Cursor | undefined | null;
    readonly size: number | undefined | null;
  }
> = {
  args: {
    cursor: {
      description: "ページのカーソル",
      type: Cursor,
    },
    size: {
      description: "ページのサイズ (デフォルト: 50)",
      type: g.GraphQLInt,
    },
  },
  description: "Entity一覧",
  type: Entity,
  resolve: async (
    _,
    { cursor, size },
    context,
  ): Promise<
    {
      nextCursor: Cursor | null;
      data: ReadonlyArray<{ readonly id: string }>;
    }
  > => {
    return await getEntities({
      ...context,
      cursor,
      size,
    });
  },
};

export const getEntities = async (
  parameter: Context & {
    readonly cursor: Cursor | undefined | null;
    readonly size: number | undefined | null;
  },
): Promise<
  { nextCursor: Cursor | null; data: ReadonlyArray<{ readonly id: string }> }
> => {
  const iter = parameter.denoKv.list<EntityValue>({ prefix: entityKeyPrefix }, {
    limit: parameter.size ?? 50,
    ...(parameter.cursor ? { cursor: parameter.cursor } : {}),
  });
  const result: Array<{ id: string }> = [];
  for await (const item of iter) {
    const id = pickEntityKeyId(item.key);
    parameter.kvDataLoader.clear(id).prime(id, item);
    result.push({ id });
  }

  return {
    data: result,
    nextCursor: iter.cursor ? cursorFrom(iter.cursor) : null,
  };
};
