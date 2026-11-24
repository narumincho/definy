/// <reference types="vite/client" />
declare module "*.css";

type Uint8ArrayToBase64Options = {
  readonly alphabet?: "base64" | "base64url";
  readonly omitPadding?: boolean;
};

type Uint8ArrayFromBase64Options = {
  readonly alphabet?: "base64" | "base64url";
  readonly lastChunkHandling?: "loose" | "strict" | "stop-before-partial";
};

type Uint8ArrayToHexOptions = Record<string, never>;

interface Uint8Array {
  readonly toBase64: (options?: Uint8ArrayToBase64Options) => string;
  readonly toHex: (options?: Uint8ArrayToHexOptions) => string;
}

interface Uint8ArrayConstructor {
  readonly fromBase64: (
    string: string,
    options?: Uint8ArrayFromBase64Options,
  ) => Uint8Array;
  readonly fromHex: (string: string) => Uint8Array;
}
