/** Base64 (標準 / URL-safe) とバイト列の変換 */
/**
 * Base64 文字列（標準 / URL-safe / パディング省略すべて対応）を Uint8Array にデコードする
 */
export function base64ToBytes(base64: string): Uint8Array {
  const isUrlSafe = base64.includes("-") || base64.includes("_");
  return Uint8Array.fromBase64(base64, {
    alphabet: isUrlSafe ? "base64url" : "base64",
    lastChunkHandling: "loose",
  });
}

/**
 * Uint8Array を標準 Base64 文字列にエンコードする
 */
export function bytesToBase64(bytes: Uint8Array): string {
  return bytes.toBase64();
}

/**
 * Uint8Array を URL-safe Base64 (パディングなし) にエンコードする
 */
export function bytesToUrlSafeBase64NoPad(bytes: Uint8Array): string {
  return bytes.toBase64({ alphabet: "base64url", omitPadding: true });
}
