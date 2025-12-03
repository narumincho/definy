const ED25519_PKCS8_HEADER = new Uint8Array([
  48,
  46,
  2,
  1,
  0,
  48,
  5,
  6,
  3,
  43,
  101,
  112,
  4,
  34,
  4,
  32,
]);

export type ExportablePrivateKey = {
  readonly cryptoKey: CryptoKey;
  readonly base64: string;
};

export async function generateExportablePrivateKey(): Promise<
  ExportablePrivateKey
> {
  const cryptoKey = (await crypto.subtle.generateKey(
    {
      name: "Ed25519",
    },
    true,
    ["sign"],
  )).privateKey;

  return {
    cryptoKey,
    base64: new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", cryptoKey),
      ED25519_PKCS8_HEADER.length,
    )
      .toBase64({
        alphabet: "base64url",
      }),
  };
}

export async function stringToPrivateKey(
  privateKeyAsBase64: string,
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array([
      ...ED25519_PKCS8_HEADER,
      ...Uint8Array.fromBase64(privateKeyAsBase64, {
        alphabet: "base64url",
      }),
    ]).buffer,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
}

export function privateKeyToPublicKey(privateKey: CryptoKey): CryptoKey {
  // TODO
}
