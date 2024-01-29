import {
  decodeHex,
  encodeHex,
} from "https://deno.land/std@0.212.0/encoding/hex.ts";
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

/**
 * ```ts
 * /^[0-9a-f]{64}$/
 * ```
 */
export type ClientKeyHash = string & { readonly ClientKeyHash: unique symbol };

export const hashClientKey = async (
  clientKey: ClientKey,
): Promise<ClientKeyHash> => {
  return clientKeyHashFrom(encodeHex(
    await crypto.subtle.digest("sha-256", decodeHex(clientKey)),
  ));
};

const clientKeyHashFrom = (id: string): ClientKeyHash => id as ClientKeyHash;
