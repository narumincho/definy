import { createHash } from "node:crypto";
import {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
  encodeCborItem,
  sha256Bytes,
  sha256EventHashId,
  toUint8Array,
} from "../src/cbor.ts";

export {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
  encodeCborItem,
  sha256Bytes,
  sha256EventHashId,
  toUint8Array,
};

/**
 * Uint8Array の SHA-256 ダイジェストを同期的に計算する (node:crypto 使用)
 */
export function sha256BytesSync(bytes: Uint8Array): Uint8Array {
  return createHash("sha256").update(bytes).digest();
}

/**
 * Uint8Array の SHA-256 ダイジェストを同期的に計算し、URL-safe Base64 (`EventHashId` 形式) を返す
 */
export function sha256EventHashIdSync(bytes: Uint8Array): string {
  return bytesToUrlSafeBase64NoPad(sha256BytesSync(bytes));
}

/**
 * `definy-event` の `derive_module_id` と同一のアルゴリズムで Module ID の内部 32 バイトを導出する
 */
export async function deriveModuleIdBytes(
  accountBytes: Uint8Array,
  moduleName: string,
): Promise<Uint8Array> {
  const prefix = new TextEncoder().encode("definy:module:");
  const sep = new TextEncoder().encode(":");
  const nameBytes = new TextEncoder().encode(moduleName);
  const buf = new Uint8Array(
    prefix.length + accountBytes.length + sep.length + nameBytes.length,
  );
  buf.set(prefix, 0);
  buf.set(accountBytes, prefix.length);
  buf.set(sep, prefix.length + accountBytes.length);
  buf.set(nameBytes, prefix.length + accountBytes.length + sep.length);
  const first = await sha256Bytes(buf);
  return await sha256Bytes(first);
}

/**
 * `definy-event` の `derive_module_id` と同一のアルゴリズムで Module ID の内部 32 バイトを同期的に導出する
 */
export function deriveModuleIdBytesSync(
  accountBytes: Uint8Array,
  moduleName: string,
): Uint8Array {
  const prefix = new TextEncoder().encode("definy:module:");
  const sep = new TextEncoder().encode(":");
  const nameBytes = new TextEncoder().encode(moduleName);
  const buf = new Uint8Array(
    prefix.length + accountBytes.length + sep.length + nameBytes.length,
  );
  buf.set(prefix, 0);
  buf.set(accountBytes, prefix.length);
  buf.set(sep, prefix.length + accountBytes.length);
  buf.set(nameBytes, prefix.length + accountBytes.length + sep.length);
  return sha256BytesSync(sha256BytesSync(buf));
}

/**
 * `definy-event` の `derive_module_part_id` と同一のアルゴリズムで Part ID (`EventHashId` 文字列) を導出する
 */
export async function deriveModulePartId(
  moduleIdBytes: Uint8Array,
  partName: string,
): Promise<string> {
  const sep = new TextEncoder().encode(":part:");
  const nameBytes = new TextEncoder().encode(partName);
  const buf = new Uint8Array(
    moduleIdBytes.length + sep.length + nameBytes.length,
  );
  buf.set(moduleIdBytes, 0);
  buf.set(sep, moduleIdBytes.length);
  buf.set(nameBytes, moduleIdBytes.length + sep.length);
  const first = await sha256Bytes(buf);
  const second = await sha256Bytes(first);
  return bytesToUrlSafeBase64NoPad(second);
}

/**
 * `definy-event` の `derive_module_part_id` と同一のアルゴリズムで Part ID (`EventHashId` 文字列) を同期的に導出する
 */
export function deriveModulePartIdSync(
  moduleIdBytes: Uint8Array,
  partName: string,
): string {
  const sep = new TextEncoder().encode(":part:");
  const nameBytes = new TextEncoder().encode(partName);
  const buf = new Uint8Array(
    moduleIdBytes.length + sep.length + nameBytes.length,
  );
  buf.set(moduleIdBytes, 0);
  buf.set(sep, moduleIdBytes.length);
  buf.set(nameBytes, moduleIdBytes.length + sep.length);
  return bytesToUrlSafeBase64NoPad(sha256BytesSync(sha256BytesSync(buf)));
}

export interface ParsedSignedEventMeta {
  readonly accountId: string;
  readonly eventType: string;
  readonly createdAtRfc3339: string;
  readonly timeMs: number;
  readonly referencedContentHashes: ReadonlyArray<string>;
}

/**
 * CBOR 形式の SignedEvent からインデックス用メタデータと参照 CAS ハッシュ一覧を抽出する。
 * テスト用のダミーバイト列など CBOR として解釈できない場合はデフォルト値を返す。
 */
export function parseSignedEventMetadata(
  bytes: Uint8Array,
  fallbackEventType = "module_commit",
): ParsedSignedEventMeta {
  const now = new Date();
  const fallback: ParsedSignedEventMeta = {
    accountId: "",
    eventType: fallbackEventType,
    createdAtRfc3339: now.toISOString(),
    timeMs: now.getTime(),
    referencedContentHashes: [],
  };

  try {
    const [signedRaw] = decodeCborItem(bytes);
    if (!signedRaw || typeof signedRaw !== "object") {
      return fallback;
    }
    const signedObj = signedRaw as Record<string, unknown>;
    const eventBinaryField = signedObj.event_binary as
      { value?: unknown } | undefined;
    const innerBytes = toUint8Array(
      eventBinaryField?.value ?? eventBinaryField,
    );
    if (!innerBytes) {
      return fallback;
    }
    const [innerRaw] = decodeCborItem(innerBytes);
    if (!innerRaw || typeof innerRaw !== "object") {
      return fallback;
    }
    const innerObj = innerRaw as Record<string, unknown>;
    const accountBytes = toUint8Array(innerObj.account_id);
    const accountId = accountBytes
      ? bytesToUrlSafeBase64NoPad(accountBytes)
      : "";

    const timeField = innerObj.time as { value?: unknown } | undefined;
    const timeSec =
      typeof timeField?.value === "number"
        ? timeField.value
        : now.getTime() / 1000;
    const timeMs = Math.round(timeSec * 1000);
    const createdAtRfc3339 = new Date(timeMs).toISOString();

    const contentObj = innerObj.content as Record<string, unknown> | undefined;
    let eventType = fallbackEventType;
    const referencedHashes = new Set<string>();

    if (contentObj && typeof contentObj === "object") {
      if ("CreateAccount" in contentObj) {
        eventType = "create_account";
      } else if ("ChangeProfile" in contentObj) {
        eventType = "change_profile";
      } else if ("ModuleCommit" in contentObj) {
        eventType = "module_commit";
        const mc = contentObj.ModuleCommit as
          { parts?: ReadonlyArray<Record<string, unknown>> } | undefined;
        if (mc && Array.isArray(mc.parts)) {
          for (const part of mc.parts) {
            if (!part || typeof part !== "object") continue;
            if (part.expression == null && part.content_hash != null) {
              const hashBytes = toUint8Array(part.content_hash);
              if (hashBytes) {
                referencedHashes.add(bytesToUrlSafeBase64NoPad(hashBytes));
              } else if (typeof part.content_hash === "string") {
                referencedHashes.add(part.content_hash);
              }
            }
          }
        }
      }
    }

    return {
      accountId,
      eventType,
      createdAtRfc3339,
      timeMs,
      referencedContentHashes: Array.from(referencedHashes),
    };
  } catch {
    return fallback;
  }
}
