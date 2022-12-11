import { assertEquals } from "https://deno.land/std@0.167.0/testing/asserts.ts";
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
      url: {
        origin: "https://narumincho.com",
        path: ["meta", "name"],
        query: new Map(),
      },
      headers: {
        accept: undefined,
        authorization: undefined,
        origin: undefined,
      },
      method: "GET",
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(
    response?.status === 200 ? response.headers.contentType : undefined,
    "application/json",
  );
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
      url: {
        origin: "https://narumincho.com",
        path: [],
        query: new Map(),
      },
      headers: {
        accept: undefined,
        authorization: undefined,
        origin: undefined,
      },
      method: "GET",
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(
    response?.status === 200 ? response.headers.contentType : undefined,
    "text/html; charset=utf-8",
  );
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
      url: {
        origin: "https://narumincho.com",
        path: ["prefix"],
        query: new Map(),
      },
      headers: {
        accept: undefined,
        authorization: undefined,
        origin: undefined,
      },
      method: "GET",
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(
    response?.status === 200 ? response.headers.contentType : undefined,
    "text/html; charset=utf-8",
  );
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
      url: {
        origin: "https://narumincho.com",
        path: ["prefix", "meta", "name"],
        query: new Map(),
      },
      headers: {
        accept: undefined,
        authorization: undefined,
        origin: undefined,
      },
      method: "GET",
    },
  );
  assertEquals(response?.status, 200);
  assertEquals(
    response?.status === 200 ? response.headers.contentType : undefined,
    "application/json",
  );
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
        url: {
          origin: "https://narumincho.com",
          path: [],
          query: new Map(),
        },
        headers: {
          accept: undefined,
          authorization: undefined,
          origin: undefined,
        },
        method: "GET",
      },
    ),
    undefined,
  );
});
