import { createHash } from "sha256-uint8array";
export const stringToSha256HashValueRaw = (str: string): string =>
  createHash("sha256").update(str).digest("hex");

export const bufferAndMimeTypeToSha256HashValueRaw = (option: {
  buffer: Buffer;
  mimeType: string;
}): string =>
  createHash("sha256")
    .update(option.buffer)
    .update(option.mimeType)
    .digest("hex");
