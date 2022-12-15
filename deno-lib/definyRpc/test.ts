import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.167.0/testing/asserts.ts";
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
import { handleRequest } from "./server/definyRpc.ts";
import { simpleResponseToResponse } from "../simpleRequestResponse/simpleResponse.ts";
import { requestObjectToSimpleRequest } from "../simpleRequestResponse/simpleRequest.ts";
import { name } from "./example/generated/meta.ts";

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
      },
      method: "GET",
      body: undefined,
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
      },
      method: "GET",
      body: undefined,
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
      },
      method: "GET",
      body: undefined,
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
      },
      method: "GET",
      body: undefined,
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
        },
        method: "GET",
        body: undefined,
      },
    ),
    undefined,
  );
});

Deno.test(
  "name test",
  () =>
    new Promise((resolve) => {
      const abortController = new AbortController();
      try {
        serve(async (request) => {
          const simpleRequest = await requestObjectToSimpleRequest(request);
          if (simpleRequest === undefined) {
            return new Response("simpleRequestに変換できなかった", { status: 400 });
          }
          const simpleResponse = await handleRequest(
            {
              all: () => ({ functionsList: [], typeList: [] }),
              codeGenOutputFolderPath: undefined,
              name: "test server name",
              originHint: "http://0.0.0.0:5001",
            },
            simpleRequest,
          );
          if (simpleResponse === undefined) {
            throw new Error("definy RPC で処理するはずのところを無視した");
          }
          return simpleResponseToResponse(simpleResponse);
        }, {
          port: 5001,
          signal: abortController.signal,
          onListen: () => {
            name({ url: new URL("http://localhost:5001") }).then((result) => {
              console.log("result===", result);
              assert(
                result.type === "ok" && result.value === "test server name",
              );
              resolve();
            });
          },
        });
      } finally {
        abortController.abort();
      }
    }),
);
