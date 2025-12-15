import {
  Bytes,
  getPublicKeyAsync,
  keygenAsync,
  signAsync,
  verifyAsync,
} from "@noble/ed25519";
import * as v from "@valibot/valibot";

/**
 * definy では nostr と同様に公開鍵とアカウントIDは同一
 */
export const AccountId = v.pipe(v.instance(Uint8Array), v.brand("AccountId"));

export type AccountId = v.InferOutput<typeof AccountId>;

function accountIdFromBytes(bytes: Bytes): AccountId {
  return bytes as AccountId;
}

const secretKeySymbol = Symbol("secretKey");

export type SecretKey = Uint8Array & { [secretKeySymbol]: never };

function secretKeyFromBytes(bytes: Bytes): SecretKey {
  return bytes as SecretKey;
}

export function secretKeyFromBase64(base64: string): SecretKey {
  return secretKeyFromBytes(
    Uint8Array.fromBase64(base64, { alphabet: "base64url" }),
  );
}

/**
 * ランダムな秘密鍵を生成する
 */
export async function generateSecretKey(): Promise<SecretKey> {
  const { secretKey } = await keygenAsync();
  return secretKeyFromBytes(secretKey);
}

/**
 * 秘密鍵から公開鍵を導出する
 */
export async function secretKeyToAccountId(
  secretKey: SecretKey,
): Promise<AccountId> {
  return accountIdFromBytes(await getPublicKeyAsync(secretKey));
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

/**
 * データを検証する
 */
export async function verify(
  data: Bytes,
  signature: Bytes,
  accountId: AccountId,
): Promise<boolean> {
  return await verifyAsync(data, signature, accountId);
}
