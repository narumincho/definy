import { AccountCode } from "./type/accountCode.ts";
import { AccountDisplayName } from "./type/accountDisplayName.ts";
import { TotpKeyId } from "./type/id.ts";

export type Idea = {
  readonly title: string;
  readonly createAccountId: string;
  readonly createDateTime: Date;
  readonly tags: ReadonlyArray<string>;
};

export const entityKeyPrefix = ["entity"];

export const entityKey = (uuid: string) => [...entityKeyPrefix, uuid];

export const pickEntityKeyId = (key: Deno.KvKey): string => {
  const lastPart = key[key.length - 1];
  if (typeof lastPart !== "string") {
    throw new Error("invalid key in pickEntityKeyId");
  }
  return lastPart;
};

export type EntityValue = Account;

export type Account = {
  readonly type: "account";
  readonly displayName: AccountDisplayName;
  readonly code: AccountCode;
  readonly createDateTime: Date;
};

export const temporaryTotpKeyKey = (
  totpKeyId: TotpKeyId,
) => ["temporaryTotpKey", totpKeyId];

export type temporaryTotpKeyValue = {};

export const cacheAccountByCodeKey = (
  accountCode: AccountCode,
) => ["cache", "accountByCode", accountCode];

export type CacheAccountByCodeValue = string;
