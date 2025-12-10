import {
  CreateAccountEvent,
  encodeCreateAccountEventWithSignature,
  verifyCreateAccountEvent,
} from "./main.ts";
import { generateKeyPair } from "./key.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { decodeCbor, encodeCbor } from "@std/cbor";

Deno.test("sign and verify create account event", async () => {
  const { secretKey } = await generateKeyPair();
  const eventData: CreateAccountEvent = { name: "test-user" };

  // Sign
  const signedEvent = await encodeCreateAccountEventWithSignature(
    eventData,
    secretKey,
  );

  // Verify
  const verifiedEvent = await verifyCreateAccountEvent(signedEvent);

  assertEquals(verifiedEvent, eventData);
});

Deno.test("header should contain publicKey", async () => {
  const { secretKey, publicKey } = await generateKeyPair();
  const eventData: CreateAccountEvent = { name: "test-user" };

  const signedEvent = await encodeCreateAccountEventWithSignature(
    eventData,
    secretKey,
  );

  const decoded = decodeCbor(signedEvent);
  if (!Array.isArray(decoded)) throw new Error("Invalid COSE");
  const unwrappedHeader = decoded[1] as
    | Map<number, Uint8Array>
    | Record<number, Uint8Array>;

  // Unprotected header is the second element.
  // It can be a Map or Object depending on cbor implementation, but @std/cbor uses Object for maps with string keys?
  // Wait, cbor maps with integer keys might be Maps or Objects.
  // Let's assume Map first or check.
  // In `cose.ts`, we used `{ 4: publicKey }`.

  // If we used Object literal in `cose.ts`, @std/cbor usually decodes map with string keys as Object,
  // but integer keys might be tricky.
  // Let's check what `decodeCbor` returns for `{ 4: val }`.
  // Actually, standard JS objects only support string/symbol keys.
  // If the key is number 4, it will be coerced to string "4".

  const header = unwrappedHeader as Record<string, Uint8Array>;
  assertEquals(header["4"], publicKey);
});

Deno.test("verify should fail with wrong key (tampered header)", async () => {
  const { secretKey } = await generateKeyPair();
  const { publicKey: wrongPublicKey } = await generateKeyPair();
  const eventData: CreateAccountEvent = { name: "test-user" };

  const signedEvent = await encodeCreateAccountEventWithSignature(
    eventData,
    secretKey,
  );

  const decoded = decodeCbor(signedEvent);
  if (!Array.isArray(decoded)) throw new Error("Invalid COSE");

  // Replace the public key in the unprotected header (index 1)
  const header = decoded[1] as
    | Map<number, Uint8Array>
    | Record<number, Uint8Array>;

  // We need to re-encode this with the wrong key
  // Since we can't easily modify the encoded bytes without re-encoding,
  // let's manually construct a tampered COSE object or modify the decoded structure and re-encode using encodeCbor from @std/cbor
  // Note: encodeCreateAccountEventWithSignature uses signCose which does encoding.

  // Let's rely on decoding -> modifying -> encoding
  if (header instanceof Map) {
    header.set(4, wrongPublicKey);
  } else {
    (header as Record<string, unknown>)["4"] = wrongPublicKey;
  }

  const tamperedEvent = encodeCbor(decoded);

  await assertRejects(
    async () => {
      await verifyCreateAccountEvent(tamperedEvent);
    },
    Error,
    "Invalid signature",
  );
});

Deno.test("verify should fail with tampered payload", async () => {
  const { secretKey } = await generateKeyPair();
  const eventData: CreateAccountEvent = { name: "test-user" };

  const signedEvent = await encodeCreateAccountEventWithSignature(
    eventData,
    secretKey,
  );

  // Tamper with the payload (it's the 3rd element in the COSE array)
  // COSE_Sign1 = [protected, unprotected, payload, signature]
  // We need to decode, modify, and re-encode to simulate tampering effectively
  // or just bit-flip if we know where the payload is.
  // Since it's CBOR, let's just mess up the last bytes which are likely the signature or payload
  const tampered = new Uint8Array(signedEvent);
  if (tampered.length > 0) {
    tampered[tampered.length - 1]! ^= 1;
  }

  await assertRejects(
    async () => {
      await verifyCreateAccountEvent(tampered);
    },
    Error,
    "Invalid signature", // or decode error depending on what we hit
  );
});
