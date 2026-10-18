/// <reference types="vite/client" />
declare module "*.css";

interface Uint8ArrayToBase64Options {
  alphabet?: "base64" | "base64url";
  omitPadding?: boolean;
}

interface Uint8ArrayFromBase64Options {
  alphabet?: "base64" | "base64url";
  lastChunkHandling?: "loose" | "strict" | "stop-before-partial";
}

interface Uint8ArrayToHexOptions {}

interface Uint8Array {
  toBase64?(options?: Uint8ArrayToBase64Options): string;
  toHex?(options?: Uint8ArrayToHexOptions): string;
}

interface Uint8ArrayConstructor {
  fromBase64?(
    string: string,
    options?: Uint8ArrayFromBase64Options,
  ): Uint8Array;
  fromHex?(string: string): Uint8Array;
}
