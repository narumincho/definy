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
  readonly publicKey: CryptoKey;
  readonly base64: string;
  readonly accountId: string;
};

export async function generateExportablePrivateKey(): Promise<
  ExportablePrivateKey
> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "Ed25519",
    },
    true,
    ["sign", "verify"],
  );

  return {
    cryptoKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    base64: new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
      ED25519_PKCS8_HEADER.length,
    )
      .toBase64({
        alphabet: "base64url",
      }),
    accountId: await publicKeyToAccountId(keyPair.publicKey),
  };
}

export async function stringToPrivateKey(
  privateKeyAsBase64: string,
): Promise<ExportablePrivateKey> {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array([
      ...ED25519_PKCS8_HEADER,
      ...Uint8Array.fromBase64(privateKeyAsBase64, {
        alphabet: "base64url",
      }),
    ]).buffer,
    { name: "Ed25519" },
    true,
    ["sign"],
  );
  const publicKey = await privateKeyToPublicKey(privateKey);
  return {
    cryptoKey: privateKey,
    publicKey,
    base64: privateKeyAsBase64,
    accountId: await publicKeyToAccountId(publicKey),
  };
}

export async function privateKeyToPublicKey(
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return await crypto.subtle.importKey(
    "jwk" as any,
    {
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      ext: true,
      key_ops: ["verify"],
    } as any,
    { name: "Ed25519" },
    true,
    ["verify"],
  );
}

export async function publicKeyToAccountId(
  publicKey: CryptoKey,
): Promise<string> {
  return new Uint8Array(await crypto.subtle.exportKey("raw", publicKey))
    .toBase64({
      alphabet: "base64url",
    });
}
