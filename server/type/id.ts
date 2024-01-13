import { createIdGraphQLScalarType } from "npm:@narumincho/simple-graphql-server-common@0.1.2";

export type AccountId = string & { readonly AccountId: unique symbol };

export const AccountId = createIdGraphQLScalarType<AccountId>(
  "AccountId",
);

export const accountIdFrom = (id: string): AccountId => id as AccountId;

export type TotpKeyId = string & { readonly TotpKeyId: unique symbol };

export const TotpKeyId = createIdGraphQLScalarType<TotpKeyId>(
  "TotpKeyId",
);

export const totpKeyIdIdFrom = (id: string): TotpKeyId => id as TotpKeyId;
