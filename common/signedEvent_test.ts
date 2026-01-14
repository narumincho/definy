import { signEvent, verifyAndParseEvent } from "./signedEvent.ts";
import { generateSecretKey, secretKeyToAccountId } from "./key.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { CreateAccountEvent } from "./event.ts";

Deno.test("sign and verify event", async () => {
  const secretKey = await generateSecretKey();
  const accountId = await secretKeyToAccountId(secretKey);
  const createAccountEvent: CreateAccountEvent = {
    type: "create_account",
    name: "test-user",
    accountId,
    time: new Date(),
  };

  const signedEventBytes = await signEvent(createAccountEvent, secretKey);

  const verifiedEvent = await verifyAndParseEvent(signedEventBytes);

  assertEquals(verifiedEvent, createAccountEvent);
});

Deno.test("verify should fail with tampered signature", async () => {
  const secretKey = await generateSecretKey();
  const accountId = await secretKeyToAccountId(secretKey);
  const createAccountEvent: CreateAccountEvent = {
    type: "create_account",
    name: "test-user",
    accountId,
    time: new Date(),
  };

  const signedEventBytes = await signEvent(createAccountEvent, secretKey);

  // Tamper with the last byte
  const tampered = new Uint8Array(signedEventBytes);
  if (tampered.length > 0) {
    tampered[tampered.length - 1]! ^= 1;
  }

  await assertRejects(
    async () => {
      await verifyAndParseEvent(tampered);
    },
    Error,
  );
});
