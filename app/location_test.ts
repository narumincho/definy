// url_test.ts
import { assertEquals } from "https://deno.land/std@0.211.0/assert/mod.ts";
import { pathAndQueryFromUrl } from "./location.ts";

Deno.test("pathAndQueryFromUrl", () => {
  assertEquals(
    pathAndQueryFromUrl(
      new URL("https://definy.deno.dev/sample/segment?mul=A&mul=B"),
    ),
    {
      pathSegments: ["sample", "segment"],
      query: new Map([["mul", "B"]]),
    },
  );
});
