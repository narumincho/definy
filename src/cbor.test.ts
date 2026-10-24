import { describe, expect, it } from "vitest";
import {
  deriveModuleIdBytesSync,
  deriveModulePartIdSync,
  sha256Bytes,
  sha256BytesSync,
} from "./cbor.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "../worker/cbor.ts";

function hex(bytes: Uint8Array): string {
  return bytes.toHex();
}

describe("sha256BytesSync", () => {
  it("matches the FIPS 180-2 test vectors", () => {
    const enc = new TextEncoder();
    expect(hex(sha256BytesSync(new Uint8Array()))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(hex(sha256BytesSync(enc.encode("abc")))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(
      hex(
        sha256BytesSync(
          enc.encode(
            "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
          ),
        ),
      ),
    ).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  });

  it("matches Web Crypto around block boundaries", async () => {
    for (const length of [1, 55, 56, 63, 64, 65, 119, 120, 1000]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 31 + 7) & 0xff);
      expect(hex(sha256BytesSync(bytes))).toBe(hex(await sha256Bytes(bytes)));
    }
  });
});

describe("module / part ID derivation", () => {
  it("sync and async versions agree", async () => {
    const moduleId = deriveModuleIdBytesSync("std");
    expect(hex(moduleId)).toBe(hex(await deriveModuleIdBytes("std")));
    expect(deriveModulePartIdSync(moduleId, "abs")).toBe(
      await deriveModulePartId(moduleId, "abs"),
    );
  });
});
