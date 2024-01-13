import * as g from "npm:graphql";
import { TotpKeyId } from "./id.ts";
import { AccountCode } from "./accountCode.ts";
import { Account } from "./account.ts";

export type CreateAccountDuplicateCode = {
  readonly __typename: "CreateAccountDuplicateCode";
  readonly accountCode: AccountCode;
};

export const CreateAccountDuplicateCode = new g.GraphQLObjectType({
  name: "CreateAccountDuplicateCode",
  description: "",
  fields: {
    accountCode: {
      type: new g.GraphQLNonNull(AccountCode),
      description: "",
    },
  },
});

export type CreateAccountNotFoundTotpKeyId = {
  readonly __typename: "CreateAccountNotFoundTotpKeyId";
  readonly keyId: TotpKeyId;
};

export const CreateAccountNotFoundTotpKeyId = new g.GraphQLObjectType({
  name: "CreateAccountNotFoundTotpKeyId",
  description: "",
  fields: {
    keyId: {
      type: new g.GraphQLNonNull(TotpKeyId),
      description: "",
    },
  },
});

export type CreateAccountInvalidCode = {
  readonly __typename: "CreateAccountInvalidCode";
  readonly accountCode: AccountCode;
};

export const CreateAccountInvalidCode = new g.GraphQLObjectType({
  name: "CreateAccountInvalidCode",
  description: "",
  fields: {
    accountCode: {
      type: new g.GraphQLNonNull(AccountCode),
      description: "",
    },
  },
});

export type CreateAccountResultOk = {
  readonly __typename: "CreateAccountResultOk";
  readonly account: Account;
};

export const CreateAccountResultOk = new g.GraphQLObjectType({
  name: "CreateAccountResultOk",
  description: "",
  fields: {
    account: {
      type: new g.GraphQLNonNull(Account),
      description: "",
    },
  },
});

export type CreateAccountResult =
  | CreateAccountNotFoundTotpKeyId
  | CreateAccountDuplicateCode
  | CreateAccountInvalidCode
  | CreateAccountResultOk;

export const CreateAccountResult = new g.GraphQLUnionType({
  name: "CreateAccountResult",
  types: [
    CreateAccountNotFoundTotpKeyId,
    CreateAccountDuplicateCode,
    CreateAccountInvalidCode,
    CreateAccountResultOk,
  ],
});
