import { createIdGraphQLScalarType } from "npm:@narumincho/simple-graphql-server-common@0.1.2";

export type AccountId = string & { readonly AccountId: unique symbol };

export const AccountId = createIdGraphQLScalarType<AccountId>(
  "AccountId",
);

export const accountIdFrom = (id: string): AccountId => id as AccountId;
