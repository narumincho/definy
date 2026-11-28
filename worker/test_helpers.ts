import { bytesToBase64 } from "../src/base64.ts";
import { sha256EventHashId } from "../src/sha256.ts";
import {
  createSignedAccountEvent,
  generateAccountCredentials,
} from "../src/auth.ts";
export { createSqliteD1Database } from "./sqlite_d1.ts";

export const adminCredentials = await generateAccountCredentials("admin");

/** CAS にアップロードできる（ハッシュが中身と一致する）コンテンツ */
export async function casItem(
  bytes: Uint8Array,
): Promise<{ readonly contentHash: string; readonly contentBytes: string }> {
  return {
    contentHash: await sha256EventHashId(bytes),
    contentBytes: bytesToBase64(bytes),
  };
}

/** 新しいアカウントの署名済み CreateAccount イベント */
export async function newSignedAccountEvent(): Promise<string> {
  const creds = await generateAccountCredentials("tester");
  return (await createSignedAccountEvent(creds)).signedEventBytes;
}
