import { assertEquals } from "@std/assert";
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
