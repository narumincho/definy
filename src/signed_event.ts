/**
 * SignedEvent (`{ signature, event_binary: tag24(Event) }`) のデコードと Ed25519 署名検証。
 * Worker (SubmitEvent の受理) とブラウザ (受信したイベントの表示前チェック) の両方で使う。
 */
import {
  base64ToBytes,
  bytesToUrlSafeBase64NoPad,
  decodeCborItem,
  sha256EventHashId,
  toUint8Array,
} from "./cbor.ts";
import {
  decodeEventContent,
  type EventContent,
  type EventType,
} from "./event_content.ts";

export type ParsedSignedEventMeta = {
  readonly accountId: string;
  readonly eventType: EventType;
  readonly createdAtRfc3339: string;
  readonly timeMs: number;
  readonly referencedContentHashes: ReadonlyArray<string>;
};

export type { EventType } from "./event_content.ts";

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
  readonly content: EventContent;
  readonly meta: ParsedSignedEventMeta;
};

/** CAS に預けた式の content hash (コミットを受理する前に CAS に揃っている必要がある) */
function referencedContentHashesOf(
  content: EventContent,
): ReadonlyArray<string> {
  if (content.type !== "project_commit") {
    return [];
  }
  const hashes = new Set<string>();
  for (const module of content.commit.modules) {
    for (const part of module.parts) {
      if (part.expression === null && part.contentHash !== null) {
        hashes.add(part.contentHash);
      }
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
  const content = decodeEventContent(innerObj.content);
  if (content === undefined) {
    throw new InvalidSignedEventError(
      "content must be a value of core.event-content",
    );
  }

  return {
    signature,
    innerBytes,
    accountIdBytes,
    content,
    meta: {
      accountId: bytesToUrlSafeBase64NoPad(accountIdBytes),
      eventType: content.type,
      createdAtRfc3339: new Date(timeMs).toISOString(),
      timeMs,
      referencedContentHashes: referencedContentHashesOf(content),
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
 * SignedEvent を厳密にデコードし、`account_id` の公開鍵で Ed25519 署名を検証して中身を返す。
 * 署名が不正・形式が不正・署名時刻が未来すぎる場合は `InvalidSignedEventError` を投げる。
 */
export async function decodeVerifiedSignedEvent(
  bytes: Uint8Array,
  nowMs: number = Date.now(),
): Promise<{
  readonly accountIdBytes: Uint8Array;
  readonly content: EventContent;
  readonly meta: ParsedSignedEventMeta;
}> {
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
  const { accountIdBytes, content, meta } = decoded;
  return { accountIdBytes, content, meta };
}

/**
 * SignedEvent を厳密にデコードし、`account_id` の公開鍵で Ed25519 署名を検証する。
 * 署名が不正・形式が不正・署名時刻が未来すぎる場合は `InvalidSignedEventError` を投げる。
 */
export async function verifySignedEvent(
  bytes: Uint8Array,
  nowMs: number = Date.now(),
): Promise<ParsedSignedEventMeta> {
  return (await decodeVerifiedSignedEvent(bytes, nowMs)).meta;
}

/** サーバーから受け取った 1 件のイベントをブラウザ側で検証した結果 */
export type EventVerification =
  | { readonly status: "valid" }
  | { readonly status: "invalid"; readonly reason: string };

/** サーバーが `GetEvents` / `GetEvent` で返すイベント 1 件 (検証前) */
export type UnverifiedEventRecord = {
  readonly eventHash: string;
  readonly signedEventBytes: string;
  readonly accountId: string;
  readonly eventType: string;
  readonly timeMs: number;
};

/**
 * サーバーから配信されたイベントを信用せずに検証する。
 * - `signedEventBytes` の Ed25519 署名が `account_id` の公開鍵で正しいこと (`verifySignedEvent`)
 * - `eventHash` が `signedEventBytes` の SHA-256 と一致すること
 * - サーバーが付けたメタデータ (`accountId` / `eventType` / `timeMs`) が署名済みの中身と一致すること
 */
export async function verifyEventRecord(
  record: UnverifiedEventRecord,
  nowMs: number = Date.now(),
): Promise<EventVerification> {
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(record.signedEventBytes);
  } catch {
    return { status: "invalid", reason: "signedEventBytes is not Base64" };
  }
  let meta: ParsedSignedEventMeta;
  try {
    meta = await verifySignedEvent(bytes, nowMs);
  } catch (e) {
    return {
      status: "invalid",
      reason: e instanceof Error ? e.message : String(e),
    };
  }
  if ((await sha256EventHashId(bytes)) !== record.eventHash) {
    return {
      status: "invalid",
      reason: "eventHash does not match SHA-256 of signedEventBytes",
    };
  }
  if (meta.accountId !== record.accountId) {
    return {
      status: "invalid",
      reason: "accountId does not match the signed event",
    };
  }
  if (meta.eventType !== record.eventType) {
    return {
      status: "invalid",
      reason: "eventType does not match the signed event",
    };
  }
  if (meta.timeMs !== record.timeMs) {
    return {
      status: "invalid",
      reason: "timeMs does not match the signed event",
    };
  }
  return { status: "valid" };
}
