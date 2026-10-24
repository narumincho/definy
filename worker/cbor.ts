import {
  InvalidSignedEventError,
  parseSignedEventMetadata,
  verifySignedEvent,
  type EventType,
  type ParsedSignedEventMeta,
} from "../src/signed_event.ts";
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
  InvalidSignedEventError,
  parseSignedEventMetadata,
  verifySignedEvent,
  type EventType,
  type ParsedSignedEventMeta,
};

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
 * モジュール名から Module ID の内部 32 バイトを導出する. モジュールはアカウントによらず名前で決まり,
 * 誰がコミットできるかはブランチで決まる (docs/branch.md)
 */
export async function deriveModuleIdBytes(
  moduleName: string,
): Promise<Uint8Array> {
  const prefix = new TextEncoder().encode("definy:module:");
  const nameBytes = new TextEncoder().encode(moduleName);
  const buf = new Uint8Array(prefix.length + nameBytes.length);
  buf.set(prefix, 0);
  buf.set(nameBytes, prefix.length);
  const first = await sha256Bytes(buf);
  return await sha256Bytes(first);
}

/**
 * Module ID とパーツ名から Part ID (`EventHashId` 文字列) を導出する
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
