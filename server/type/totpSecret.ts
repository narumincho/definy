import { createRegExpType } from "npm:@narumincho/simple-graphql-server-common@0.1.2";

export type TotpSecret = string & { readonly TotpSecret: unique symbol };

export const TotpSecret = createRegExpType<TotpSecret>({
  name: "TotpSecret",
  description: "Base32でエンコードされたTOTPのシークレット",
  // https://qiita.com/koseki/items/c902c1495fbaa0120cd3
  regexp:
    /^(?:[A-Z2-7]{8})*(?:[A-Z2-7][AEIMQUY4]={6}|[A-Z2-7]{3}[AQ]={4}|[A-Z2-7]{4}[ACEGIKMOQSUWY246]={3}|[A-Z2-7]{6}[AIQY]=)?$/,
});

export const totpSecretFrom = (id: string): TotpSecret => id as TotpSecret;
