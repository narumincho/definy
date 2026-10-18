import type { PartChange, WorkingChanges } from "./types.ts";
import { base64ToBytes, bytesToUrlSafeBase64NoPad } from "./cbor.ts";

/** `Uint8Array` を `{"$bytes": "<Base64URL>"}` にする (素の JSON.stringify は `{"0":..}` に壊す) */
function serializeReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return { $bytes: bytesToUrlSafeBase64NoPad(value) };
  }
  return value;
}

/** `{"$bytes": "<Base64URL>"}` を `Uint8Array` に戻す */
function deserializeReviver(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "$bytes") {
      const bytesStr = (value as { readonly $bytes?: unknown }).$bytes;
      if (typeof bytesStr === "string") {
        return base64ToBytes(bytesStr);
      }
    }
  }
  return value;
}

/** 作業中の変更を localStorage に保存できる JSON 文字列にする */
export function serializeWorkingChanges(changes: WorkingChanges): string {
  const plainParts: Record<string, PartChange> = Object.fromEntries(
    changes.parts,
  );
  return JSON.stringify({ parts: plainParts }, serializeReplacer);
}

/** `serializeWorkingChanges` の結果を復元する。壊れた JSON のときは空の WorkingChanges を返す */
export function deserializeWorkingChanges(text: string): WorkingChanges {
  try {
    const parsed = JSON.parse(text, deserializeReviver) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { parts: new Map<string, PartChange>() };
    }
    const partsRecord = (parsed as { readonly parts?: unknown }).parts;
    if (
      typeof partsRecord !== "object" ||
      partsRecord === null ||
      Array.isArray(partsRecord)
    ) {
      return { parts: new Map<string, PartChange>() };
    }
    const partsMap = new Map<string, PartChange>();
    for (const [k, v] of Object.entries(partsRecord)) {
      if (v !== null && typeof v === "object") {
        partsMap.set(k, v as PartChange);
      }
    }
    return { parts: partsMap };
  } catch {
    return { parts: new Map<string, PartChange>() };
  }
}
