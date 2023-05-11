import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import { requestParse } from "./server/requestParse.ts";
import { schemaEmpty } from "./server/main.ts";

Deno.test("request parse skip", async () => {
  assertEquals(
    (await requestParse(new Request(new URL("https://narumincho.com/sample")), {
      pathPrefix: ["api"],
      schema: schemaEmpty,
    })).type,
    "skip",
  );
});
