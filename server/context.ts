import { entityKey, EntityValue } from "./kv.ts";
import { default as DataLoader } from "npm:dataloader";

export type Context = {
  readonly denoKv: Deno.Kv;
  readonly kvDataLoader: DataLoader<string, Deno.KvEntryMaybe<EntityValue>>;
};

export const createContext = async (_parameter: {
  readonly authHeaderValue: string | undefined;
}): Promise<Context> => {
  const denoKv = await Deno.openKv();

  return {
    denoKv,
    kvDataLoader: new DataLoader<string, Deno.KvEntryMaybe<EntityValue>>(
      async (keys): Promise<ReadonlyArray<Deno.KvEntryMaybe<EntityValue>>> => {
        return await denoKv.getMany<ReadonlyArray<EntityValue>>(
          keys.map((key) => entityKey(key)),
        );
      },
    ),
  };
};
