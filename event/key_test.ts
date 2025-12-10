import { generateKeyPair, secretKeyToPublicKey } from "../event/key.ts";
import { assertEquals, assertNotEquals } from "@std/assert";

Deno.test("check accountId is same", async () => {
  const { secretKey: secretKeyA } = await generateKeyPair();
  const { secretKey: secretKeyB } = await generateKeyPair();

  assertEquals(
    await secretKeyToPublicKey(secretKeyA),
    await secretKeyToPublicKey(secretKeyA),
  );

  assertNotEquals(
    await secretKeyToPublicKey(secretKeyA),
    await secretKeyToPublicKey(secretKeyB),
  );
});
