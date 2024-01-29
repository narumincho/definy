import { entityKey, EntityValue } from "./kv.ts";
import { default as DataLoader } from "npm:dataloader";
import { Account } from "./type/account.ts";
import { accessDeniedError, accountTokenError } from "./error.ts";
import {
  decodeHex,
  encodeHex,
} from "https://deno.land/std@0.212.0/encoding/hex.ts";
import { cacheAccountByClientKeyKey } from "./kv.ts";

export type Context = {
  readonly denoKv: Deno.Kv;
  readonly kvDataLoader: DataLoader<string, Deno.KvEntryMaybe<EntityValue>>;
  readonly client: Deno.KvEntryMaybe<Account> | Error | undefined;
};

export const createContext = async (parameter: {
  readonly authHeaderValue: string | undefined;
  readonly denoKvDatabasePath: string | undefined;
}): Promise<Context> => {
  const denoKv = await Deno.openKv(parameter.denoKvDatabasePath);

  return {
    denoKv,
    kvDataLoader: new DataLoader<string, Deno.KvEntryMaybe<EntityValue>>(
      async (keys): Promise<ReadonlyArray<Deno.KvEntryMaybe<EntityValue>>> => {
        return await denoKv.getMany<ReadonlyArray<EntityValue>>(
          keys.map((key) => entityKey(key)),
        );
      },
    ),
    client: await getAccountFromAuthorizationHeaderValue(
      parameter.authHeaderValue,
      denoKv,
    ),
  };
};

const getAccountFromAuthorizationHeaderValue = async (
  authHeaderValue: string | undefined,
  denoKv: Deno.Kv,
): Promise<
  Deno.KvEntryMaybe<Account> | Error | undefined
> => {
  if (authHeaderValue === undefined) {
    return undefined;
  }
  const matchResult = authHeaderValue.match(/^bearer ([0-9a-f]{64})$/iu)?.[1];
  if (!matchResult) {
    return accountTokenError(
      `authorization header value is invalid.
actual: "${authHeaderValue}"
expected: "Bearer ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"`,
    );
  }
  const keyHash = encodeHex(
    await crypto.subtle.digest("sha-256", decodeHex(matchResult)),
  );
  const coach = await denoKv.get(cacheAccountByClientKeyKey());
  if (!coach) {
    return accessDeniedError(
      `端末キーに対応するアカウントが見つかりませんでした
key=${matchResult}
keyHash=${keyHash}`,
    );
  }
  return {
    id: coach.id,
    name: coach.name,
    nameKana: coach.nameKana,
  };
};
