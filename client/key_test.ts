import { generateExportablePrivateKey, stringToPrivateKey } from "./key.ts";
import { assertEquals } from "@std/assert";

Deno.test("check accountId is same", async () => {
  const exportableKey = await generateExportablePrivateKey();

  const derivedAccountId = await stringToPrivateKey(exportableKey.base64);

  assertEquals(exportableKey.accountId, derivedAccountId.accountId);
});
