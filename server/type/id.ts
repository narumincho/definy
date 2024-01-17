import { createRegExpType } from "npm:@narumincho/simple-graphql-server-common@0.1.2";

const idRegExp = /^[0-9a-f]{32}$/;

export type AccountId = string & { readonly AccountId: unique symbol };

export const AccountId = createRegExpType<AccountId>({
  name: "AccountId",
  description: "",
  regexp: idRegExp,
});

export const accountIdFrom = (id: string): AccountId => id as AccountId;

export type TotpKeyId = string & { readonly TotpKeyId: unique symbol };

export const TotpKeyId = createRegExpType<TotpKeyId>({
  name: "TotpKeyId",
  description: "",
  regexp: idRegExp,
});

export const totpKeyIdIdFrom = (id: string): TotpKeyId => id as TotpKeyId;
