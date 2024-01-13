import { createTextGraphQLScalarType } from "npm:@narumincho/simple-graphql-server-common@0.1.2";

export type AccountDisplayName = string & {
  readonly AccountDisplayName: unique symbol;
};

export const AccountDisplayName = createTextGraphQLScalarType<
  AccountDisplayName
>(
  "AccountDisplayName",
  64,
);
