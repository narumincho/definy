import {
  Bytes,
  getPublicKeyAsync,
  keygenAsync,
  signAsync,
} from "@noble/ed25519";

const publicKeySymbol = Symbol("publicKey");

export type PublicKey = Uint8Array & { [publicKeySymbol]: never };

function publicKeyFromBytes(bytes: Bytes): PublicKey {
  return bytes as PublicKey;
}

const secretKeySymbol = Symbol("secretKey");

export type SecretKey = Uint8Array & { [secretKeySymbol]: never };

function secretKeyFromBytes(bytes: Bytes): SecretKey {
  return bytes as SecretKey;
}

/**
 * ランダムな秘密鍵を生成する
 */
export async function generateKeyPair(): Promise<
  { secretKey: SecretKey; publicKey: PublicKey }
> {
  const { secretKey, publicKey } = await keygenAsync();
  return {
    secretKey: secretKeyFromBytes(secretKey),
    publicKey: publicKeyFromBytes(publicKey),
  };
}

/**
 * 秘密鍵から公開鍵を導出する
 */
export async function secretKeyToPublicKey(
  secretKey: SecretKey,
): Promise<PublicKey> {
  return publicKeyFromBytes(await getPublicKeyAsync(secretKey));
}

/**
 * データを署名する
 */
export async function sign(
  data: Bytes,
  secretKey: SecretKey,
): Promise<Bytes> {
  return await signAsync(data, secretKey);
}
