/**
 * definy アカウントの Ed25519 鍵で Connect-RPC リクエストに署名・検証する。
 *
 * `Authorization: Definy-Ed25519 <accountId>.<unixSeconds>.<signature>`
 *
 * 署名対象は `rpcAuthorizationMessage` が返す UTF-8 文字列
 * （メソッド・パス・時刻・ボディの SHA-256 を改行で連結したもの）。
 * 時刻のずれが `RPC_AUTHORIZATION_MAX_SKEW_SECONDS` を超えるものは拒否する。
 */

import {
  base64ToBytes,
  bytesToUrlSafeBase64NoPad,
  sha256EventHashId,
} from "./cbor.ts";
import {
  type AccountCredentials,
  importPrivateKeyFromSecretKey,
} from "./auth.ts";

const SCHEME = "Definy-Ed25519";
export const RPC_AUTHORIZATION_MAX_SKEW_SECONDS = 300;

async function rpcAuthorizationMessage(
  method: string,
  pathname: string,
  timeSeconds: number,
  body: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const bodyHash = await sha256EventHashId(new TextEncoder().encode(body));
  return new Uint8Array(
    new TextEncoder().encode(
      ["definy-rpc-v1", method.toUpperCase(), pathname, timeSeconds, bodyHash]
        .map(String)
        .join("\n"),
    ),
  );
}

/** `Authorization` ヘッダーの値を作る */
export async function createRpcAuthorization(
  credentials: AccountCredentials,
  method: string,
  pathname: string,
  body: string,
  timeSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const key = await importPrivateKeyFromSecretKey(credentials.secretKeyBase64);
  const message = await rpcAuthorizationMessage(
    method,
    pathname,
    timeSeconds,
    body,
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "Ed25519" }, key, message),
  );
  return `${SCHEME} ${credentials.accountId}.${timeSeconds}.${bytesToUrlSafeBase64NoPad(signature)}`;
}

/**
 * `Authorization` ヘッダーを検証し、署名したアカウント ID を返す。
 * ヘッダーが無ければ `null`、形式・署名・時刻が不正なら例外を投げる。
 */
export async function verifyRpcAuthorization(
  header: string | null,
  method: string,
  pathname: string,
  body: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string | null> {
  if (header === null || header.trim().length === 0) {
    return null;
  }
  const [scheme, credential, ...rest] = header.trim().split(/\s+/);
  const [accountId, timeText, signatureText, ...extra] = (
    credential ?? ""
  ).split(".");
  if (
    scheme !== SCHEME ||
    rest.length > 0 ||
    extra.length > 0 ||
    !accountId ||
    !timeText ||
    !signatureText ||
    !/^\d+$/.test(timeText)
  ) {
    throw new Error(`Authorization must be '${SCHEME} <account>.<time>.<sig>'`);
  }
  const timeSeconds = Number(timeText);
  if (Math.abs(nowSeconds - timeSeconds) > RPC_AUTHORIZATION_MAX_SKEW_SECONDS) {
    throw new Error("Authorization time is out of the allowed range");
  }
  const publicKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(base64ToBytes(accountId)),
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    { name: "Ed25519" },
    publicKey,
    new Uint8Array(base64ToBytes(signatureText)),
    await rpcAuthorizationMessage(method, pathname, timeSeconds, body),
  );
  if (!valid) {
    throw new Error("Authorization signature verification failed");
  }
  return accountId;
}
