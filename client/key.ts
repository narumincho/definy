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

export type GenerateKeyResult = {
  readonly privateKey: CryptoKey;
  readonly publicKey: CryptoKey;
  readonly privateKeyAsBase64: string;
  /**
   * accountId
   */
  readonly publicKeyAsBase64: string;
};

export async function generateExportablePrivateKey(): Promise<
  GenerateKeyResult
> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "Ed25519",
    },
    true,
    ["sign", "verify"],
  );

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    privateKeyAsBase64: new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
      ED25519_PKCS8_HEADER.length,
    )
      .toBase64({
        alphabet: "base64url",
      }),
    publicKeyAsBase64: await publicKeyToAccountId(keyPair.publicKey),
  };
}

export async function stringToPrivateKey(
  privateKeyAsBase64: string,
): Promise<GenerateKeyResult> {
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
    privateKey: privateKey,
    publicKey,
    privateKeyAsBase64: privateKeyAsBase64,
    publicKeyAsBase64: await publicKeyToAccountId(publicKey),
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
