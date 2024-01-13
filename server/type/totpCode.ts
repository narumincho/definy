import { createRegExpType } from "npm:@narumincho/simple-graphql-server-common@0.1.2";

export type TotpCode = string & { readonly TotpCode: unique symbol };

export const TotpCode = createRegExpType<TotpCode>({
  name: "TotpCode",
  description: "TOTPで生成されたコード",
  regexp: /^[0-9]{6}$/,
});

export const totpCodeFrom = (id: string): TotpCode => id as TotpCode;
