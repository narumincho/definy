import { createIdGraphQLScalarType } from "npm:@narumincho/simple-graphql-server-common@0.1.0";

const parseId = <const typeName extends string>(value: unknown) => {
  if (typeof value === "string" && /^[0-9a-f]{32}$/u.test(value)) {
    return value as typeName;
  }
  throw new Error(`Invalid Id
actual: ${JSON.stringify(value)}
expected: "ffffffffffffffffffffffffffffffff"`);
};

export type AccountId = string & { readonly AccountId: unique symbol };

export const AccountId = createIdGraphQLScalarType(
  parseId<AccountId>,
  "AccountId",
);

export const accountIdFrom = (id: string): AccountId => id as AccountId;
