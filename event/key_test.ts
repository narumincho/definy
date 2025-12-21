import { assert } from "@std/assert";
import {
  generateSecretKey,
  secretKeyToAccountId,
  sign,
  verify,
} from "./key.ts";

Deno.test("sign and verify", async () => {
  const secretKey = await generateSecretKey();
  const accountId = await secretKeyToAccountId(secretKey);
  const data = new TextEncoder().encode("hello world");

  const signature = await sign(data, secretKey);

  const isValid = await verify(data, signature, accountId);

  assert(isValid, "Signature should be valid");
});
