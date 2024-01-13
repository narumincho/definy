import { createRegExpType } from "npm:@narumincho/simple-graphql-server-common@0.1.2";

export type AccountCode = string & { readonly AccountCode: unique symbol };

export const AccountCode = createRegExpType<AccountCode>({
  name: "AccountCode",
  description: "アカウントを識別できるコード",
  regexp: /^[a-z0-9._]{2,31}$/,
});

export const accountCodeFrom = (id: string): AccountCode => id as AccountCode;
