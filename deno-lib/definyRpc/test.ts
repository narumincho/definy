import { assertEquals } from "https://deno.land/std@0.166.0/testing/asserts.ts";
import { handleRequest } from "./server/definyRpc.ts";

Deno.test("get server name", async () => {
  const response = await handleRequest(
    {
      all: () => ({ functionsList: [], typeList: [] }),
      codeGenOutputFolderPath: undefined,
      name: "serverName",
      originHint: "",
    },
    {
      path: ["definyRpc", "name"],
      headers: {
        accept: undefined,
        authorization: undefined,
        origin: undefined,
      },
      method: "GET",
      query: new Map(),
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers, {
    contentType: "application/json",
  });
  assertEquals(
    JSON.parse(new TextDecoder().decode(response?.body)),
    "serverName",
  );
});

Deno.test("index.html", async () => {
  const response = await handleRequest(
    {
      all: () => ({ functionsList: [], typeList: [] }),
      codeGenOutputFolderPath: undefined,
      name: "serverName",
      originHint: "",
    },
    {
      path: [],
      headers: {
        accept: undefined,
        authorization: undefined,
        origin: undefined,
      },
      method: "GET",
      query: new Map(),
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers, {
    contentType: "text/html; charset=utf-8",
  });
});

Deno.test("with pathPrefix index.html", async () => {
  const response = await handleRequest(
    {
      all: () => ({ functionsList: [], typeList: [] }),
      codeGenOutputFolderPath: undefined,
      name: "test",
      originHint: "",
      pathPrefix: ["prefix"],
    },
    {
      path: ["prefix"],
      headers: {
        accept: undefined,
        authorization: undefined,
        origin: undefined,
      },
      method: "GET",
      query: new Map(),
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers, {
    contentType: "text/html; charset=utf-8",
  });
});

Deno.test("with pathPrefix get server name", async () => {
  const response = await handleRequest(
    {
      all: () => ({ functionsList: [], typeList: [] }),
      codeGenOutputFolderPath: undefined,
      name: "test",
      originHint: "",
      pathPrefix: ["prefix"],
    },
    {
      path: ["prefix", "definyRpc", "name"],
      headers: {
        accept: undefined,
        authorization: undefined,
        origin: undefined,
      },
      method: "GET",
      query: new Map(),
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(response?.headers, {
    contentType: "application/json",
  });
  assertEquals(
    JSON.parse(new TextDecoder().decode(response?.body)),
    "test",
  );
});

Deno.test("ignore with pathPrefix", async () => {
  assertEquals(
    await handleRequest(
      {
        all: () => ({ functionsList: [], typeList: [] }),
        codeGenOutputFolderPath: undefined,
        name: "test",
        originHint: "",
        pathPrefix: ["prefix"],
      },
      {
        path: [],
        headers: {
          accept: undefined,
          authorization: undefined,
          origin: undefined,
        },
        method: "GET",
        query: new Map(),
      },
    ),
    undefined,
  );
});
