import {
  CreateAccountEvent,
  encodeCreateAccountEventWithSignature,
  verifyCreateAccountEvent,
} from "./main.ts";
import { generateKeyPair } from "./key.ts";
import { assertEquals, assertRejects } from "@std/assert";

Deno.test("sign and verify create account event", async () => {
  const { secretKey, publicKey } = await generateKeyPair();
  const eventData: CreateAccountEvent = { name: "test-user" };

  // Sign
  const signedEvent = await encodeCreateAccountEventWithSignature(
    eventData,
    secretKey,
  );

  // Verify
  const verifiedEvent = await verifyCreateAccountEvent(signedEvent, publicKey);

  assertEquals(verifiedEvent, eventData);
});

Deno.test("verify should fail with wrong key", async () => {
  const { secretKey } = await generateKeyPair();
  const { publicKey: wrongPublicKey } = await generateKeyPair();
  const eventData: CreateAccountEvent = { name: "test-user" };

  const signedEvent = await encodeCreateAccountEventWithSignature(
    eventData,
    secretKey,
  );

  await assertRejects(
    async () => {
      await verifyCreateAccountEvent(signedEvent, wrongPublicKey);
    },
    Error,
    "Invalid signature",
  );
});

Deno.test("verify should fail with tampered payload", async () => {
  const { secretKey, publicKey } = await generateKeyPair();
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
      await verifyCreateAccountEvent(tampered, publicKey);
    },
    Error,
    "Invalid signature", // or decode error depending on what we hit
  );
});
