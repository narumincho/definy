import { assertEquals } from "https://deno.land/std@0.164.0/testing/asserts.ts";
import { definyRpc } from "./server/mod.ts";

Deno.test("get server name", async () => {
  const response = definyRpc.handleRequest(
    {
      all: () => [],
      codeGenOutputFolderPath: undefined,
      name: "serverName",
      originHint: "",
    },
    {
      path: ["definyRpc", "name"],
      headers: {
        Accept: undefined,
        Authorization: undefined,
      },
      method: "GET",
      query: new Map(),
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers, {
    ContentType: "application/json",
  });
  assertEquals(
    JSON.parse(new TextDecoder().decode(await response?.body!())),
    "serverName",
  );
});

Deno.test("index.html", () => {
  const response = definyRpc.handleRequest(
    {
      all: () => [],
      codeGenOutputFolderPath: undefined,
      name: "serverName",
      originHint: "",
    },
    {
      path: [],
      headers: {
        Accept: undefined,
        Authorization: undefined,
      },
      method: "GET",
      query: new Map(),
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers, {
    ContentType: "text/html; charset=utf-8",
  });
});

Deno.test("with pathPrefix index.html", () => {
  const response = definyRpc.handleRequest(
    {
      all: () => [],
      codeGenOutputFolderPath: undefined,
      name: "test",
      originHint: "",
      pathPrefix: ["prefix"],
    },
    {
      path: ["prefix"],
      headers: {
        Accept: undefined,
        Authorization: undefined,
      },
      method: "GET",
      query: new Map(),
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers, {
    ContentType: "text/html; charset=utf-8",
  });
});

Deno.test("with pathPrefix get server name", async () => {
  const response = definyRpc.handleRequest(
    {
      all: () => [],
      codeGenOutputFolderPath: undefined,
      name: "test",
      originHint: "",
      pathPrefix: ["prefix"],
    },
    {
      path: ["prefix", "definyRpc", "name"],
      headers: {
        Accept: undefined,
        Authorization: undefined,
      },
      method: "GET",
      query: new Map(),
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers, {
    ContentType: "application/json",
  });
  assertEquals(
    JSON.parse(new TextDecoder().decode(await response?.body!())),
    "test",
  );
});

Deno.test("ignore with pathPrefix", () => {
  assertEquals(
    definyRpc.handleRequest(
      {
        all: () => [],
        codeGenOutputFolderPath: undefined,
        name: "test",
        originHint: "",
        pathPrefix: ["prefix"],
      },
      {
        path: [],
        headers: {
          Accept: undefined,
          Authorization: undefined,
        },
        method: "GET",
        query: new Map(),
      },
    ),
    undefined,
  );
});
