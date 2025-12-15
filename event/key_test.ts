import { generateKeyPair, secretKeyToAccountId } from "../event/key.ts";
import { assertEquals, assertNotEquals } from "@std/assert";

Deno.test("check accountId is same", async () => {
  const { secretKey: secretKeyA } = await generateKeyPair();
  const { secretKey: secretKeyB } = await generateKeyPair();

  assertEquals(
    await secretKeyToAccountId(secretKeyA),
    await secretKeyToAccountId(secretKeyA),
  );

  assertNotEquals(
    await secretKeyToAccountId(secretKeyA),
    await secretKeyToAccountId(secretKeyB),
  );
});
