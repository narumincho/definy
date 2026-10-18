import {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
  deriveModuleIdBytesSync,
  deriveModulePartIdSync,
  encodeCborItem,
  sha256Bytes,
  sha256BytesSync,
  sha256EventHashId,
  sha256EventHashIdSync,
  toUint8Array,
} from "../src/cbor.ts";

export {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
  deriveModuleIdBytesSync,
  deriveModulePartIdSync,
  encodeCborItem,
  sha256Bytes,
  sha256BytesSync,
  sha256EventHashId,
  sha256EventHashIdSync,
  toUint8Array,
};

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

export type ParsedSignedEventMeta = {
  readonly accountId: string;
  readonly eventType: EventType;
  readonly createdAtRfc3339: string;
  readonly timeMs: number;
  readonly referencedContentHashes: ReadonlyArray<string>;
};

export type EventType = "create_account" | "change_profile" | "module_commit";

/** 署名済みイベントとして受理できないバイト列であることを表すエラー */
export class InvalidSignedEventError extends Error {
  override readonly name = "InvalidSignedEventError";
}

const ED25519_PUBLIC_KEY_LENGTH = 32;
const ED25519_SIGNATURE_LENGTH = 64;
/** 署名時刻として許容する未来方向のずれ */
const MAX_FUTURE_SKEW_MS = 10 * 60 * 1000;

type DecodedSignedEvent = {
  readonly signature: Uint8Array;
  readonly innerBytes: Uint8Array;
  readonly accountIdBytes: Uint8Array;
  readonly meta: ParsedSignedEventMeta;
};

function eventTypeOf(content: Record<string, unknown>): EventType {
  if ("CreateAccount" in content) return "create_account";
  if ("ChangeProfile" in content) return "change_profile";
  if ("ModuleCommit" in content) return "module_commit";
  throw new InvalidSignedEventError(
    `unknown event content: ${Object.keys(content).join(", ")}`,
  );
}

function referencedContentHashesOf(
  content: Record<string, unknown>,
): ReadonlyArray<string> {
  const mc = content.ModuleCommit as
    { readonly parts?: ReadonlyArray<Record<string, unknown>> } | undefined;
  if (!mc || !Array.isArray(mc.parts)) {
    return [];
  }
  const hashes = new Set<string>();
  for (const part of mc.parts) {
    if (!part || typeof part !== "object") continue;
    if (part.expression == null && part.content_hash != null) {
      const hashBytes = toUint8Array(part.content_hash);
      if (!hashBytes) {
        throw new InvalidSignedEventError("content_hash must be bytes");
      }
      hashes.add(bytesToUrlSafeBase64NoPad(hashBytes));
    }
  }
  return Array.from(hashes);
}

/**
 * CBOR 形式の SignedEvent (`{ signature, event_binary: tag24(内側のイベント) }`) を厳密にデコードする。
 * 署名の検証はしない。形式が不正な場合は `InvalidSignedEventError` を投げる。
 */
function decodeSignedEvent(bytes: Uint8Array): DecodedSignedEvent {
  let signedRaw: unknown;
  let innerRaw: unknown;
  let innerBytes: Uint8Array | undefined;
  try {
    const [decoded, end] = decodeCborItem(bytes);
    if (end !== bytes.length) {
      throw new InvalidSignedEventError("trailing bytes after SignedEvent");
    }
    signedRaw = decoded;
    const eventBinary = (signedRaw as Record<string, unknown> | null)
      ?.event_binary as { readonly __tag?: unknown; readonly value?: unknown };
    if (eventBinary?.__tag !== 24) {
      throw new InvalidSignedEventError("event_binary must be CBOR tag 24");
    }
    innerBytes = toUint8Array(eventBinary.value);
    if (!innerBytes) {
      throw new InvalidSignedEventError("event_binary must wrap bytes");
    }
    innerRaw = decodeCborItem(innerBytes)[0];
  } catch (e) {
    if (e instanceof InvalidSignedEventError) throw e;
    throw new InvalidSignedEventError(
      `malformed CBOR: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const signature = toUint8Array(
    (signedRaw as Record<string, unknown>).signature,
  );
  if (!signature || signature.length !== ED25519_SIGNATURE_LENGTH) {
    throw new InvalidSignedEventError("signature must be 64 bytes");
  }
  if (!innerRaw || typeof innerRaw !== "object") {
    throw new InvalidSignedEventError("inner event must be a map");
  }
  const innerObj = innerRaw as Record<string, unknown>;
  const accountIdBytes = toUint8Array(innerObj.account_id);
  if (!accountIdBytes || accountIdBytes.length !== ED25519_PUBLIC_KEY_LENGTH) {
    throw new InvalidSignedEventError("account_id must be 32 bytes");
  }
  const timeField = innerObj.time as
    { readonly __tag?: unknown; readonly value?: unknown } | undefined;
  if (timeField?.__tag !== 1 || typeof timeField.value !== "number") {
    throw new InvalidSignedEventError("time must be CBOR tag 1 epoch seconds");
  }
  const timeMs = Math.round(timeField.value * 1000);
  const content = innerObj.content;
  if (!content || typeof content !== "object") {
    throw new InvalidSignedEventError("content must be a map");
  }
  const contentObj = content as Record<string, unknown>;

  return {
    signature,
    innerBytes,
    accountIdBytes,
    meta: {
      accountId: bytesToUrlSafeBase64NoPad(accountIdBytes),
      eventType: eventTypeOf(contentObj),
      createdAtRfc3339: new Date(timeMs).toISOString(),
      timeMs,
      referencedContentHashes: referencedContentHashesOf(contentObj),
    },
  };
}

/**
 * 信頼できる経路（ビルトインのシードなど）から来た SignedEvent のインデックス用メタデータを抽出する。
 * 署名は検証しない。外部から受け取ったイベントには `verifySignedEvent` を使うこと。
 */
export function parseSignedEventMetadata(
  bytes: Uint8Array,
): ParsedSignedEventMeta {
  return decodeSignedEvent(bytes).meta;
}

/**
 * SignedEvent を厳密にデコードし、`account_id` の公開鍵で Ed25519 署名を検証する。
 * 署名が不正・形式が不正・署名時刻が未来すぎる場合は `InvalidSignedEventError` を投げる。
 */
export async function verifySignedEvent(
  bytes: Uint8Array,
  nowMs: number = Date.now(),
): Promise<ParsedSignedEventMeta> {
  const decoded = decodeSignedEvent(bytes);
  const publicKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(decoded.accountIdBytes),
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    { name: "Ed25519" },
    publicKey,
    new Uint8Array(decoded.signature),
    new Uint8Array(decoded.innerBytes),
  );
  if (!valid) {
    throw new InvalidSignedEventError("Ed25519 signature verification failed");
  }
  if (decoded.meta.timeMs > nowMs + MAX_FUTURE_SKEW_MS) {
    throw new InvalidSignedEventError("event time is too far in the future");
  }
  return decoded.meta;
}
