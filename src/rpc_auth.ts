/**
 * definy アカウントの Ed25519 鍵で Connect-RPC リクエストに署名・検証する。
 *
 * `Authorization: Definy-Ed25519 <accountId>.<unixSeconds>.<signature>`
 *
 * 署名対象は `rpcAuthorizationMessage` が返す UTF-8 文字列
 * （メソッド・パス・時刻・ボディの SHA-256 を改行で連結したもの）。
 * 検証はサーバーの definy (`definy.read-rpc-authorization`) が行い, 時刻のずれが 300 秒を超えるものは拒否する
 * (docs/rpc-authorization.md)。
 */

import { bytesToUrlSafeBase64NoPad } from "./base64.ts";
import { sha256EventHashId } from "./sha256.ts";
import {
  type AccountCredentials,
  importPrivateKeyFromSecretKey,
} from "./auth.ts";

const SCHEME = "Definy-Ed25519";
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
