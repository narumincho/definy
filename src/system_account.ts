/**
 * 開発用システムアカウント. `DEFINY_SYSTEM_ACCOUNT_*` が未設定のとき, seed の署名やビルトインモジュールの所有者に使う
 * (秘密鍵は公開されている. 詳細は docs/system-account.md). Worker からも使うので Node.js 専用の API は使わない
 */
import { base64ToBytes } from "./cbor.ts";

/** `definy-server` の開発用システムアカウント鍵 (`DEV_SYSTEM_KEY_SEED`) と同じ値 */
export const DEV_SYSTEM_KEY_SEED = new TextEncoder().encode(
  "definy-compiler-system-key-2026\0",
);

/** Ed25519 秘密鍵シードから開発用システムアカウントの公開鍵を導出する */
export async function devSystemAccountBytes(): Promise<Uint8Array> {
  const header = [
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
    0x04, 0x22, 0x04, 0x20,
  ];
  const key = await crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array([...header, ...DEV_SYSTEM_KEY_SEED]),
    { name: "Ed25519" },
    true,
    ["sign"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return base64ToBytes(jwk.x ?? "");
}
