import { createRegExpType } from "npm:@narumincho/simple-graphql-server-common@0.1.2";

export type ClientKey = string & { readonly ClientKey: unique symbol };

export const ClientKey = createRegExpType<ClientKey>({
  name: "ClientKey",
  description: "端末が端末自身であることを証明するキー",
  regexp: /^[0-9a-f]{64}$/,
});

const clientKeyFrom = (id: string): ClientKey => id as ClientKey;

export const createClientKey = (): ClientKey => {
  return clientKeyFrom(
    (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", ""),
  );
};
