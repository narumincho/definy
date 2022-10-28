import { assertEquals } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import { definyRpc } from "./server/mod.ts";

Deno.test("with pathPrefix", () => {
  const response = definyRpc.handleRequest(
    {
      all: () => [],
      codeGenOutputFolderPath: undefined,
      name: "test",
      originHint: "",
      pathPrefix: ["definyRpc"],
    },
    {
      path: ["definyRpc"],
      headers: {
        Accept: undefined,
        Authorization: undefined,
      },
      method: "GET",
      query: new Map(),
    }
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers, {
    ContentType: "text/html; charset=utf-8",
  });
});

Deno.test("ignore with pathPrefix", () => {
  assertEquals(
    definyRpc.handleRequest(
      {
        all: () => [],
        codeGenOutputFolderPath: undefined,
        name: "test",
        originHint: "",
        pathPrefix: ["definyRpc"],
      },
      {
        path: [],
        headers: {
          Accept: undefined,
          Authorization: undefined,
        },
        method: "GET",
        query: new Map(),
      }
    ),
    undefined
  );
});
