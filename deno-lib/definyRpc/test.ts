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

/*
Deno.test(
  "request query test",
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
            requestQuery({
              url: new URL("http://localhost:5001"),
              input: undefined,
              inputType: Unit.type(),
              name: "name",
              namespace: FunctionNamespace.meta,
              outputType: String.type(),
              typeMap: new Map(
                coreTypeInfoList.map((
                  info,
                ) => [
                  namespaceToString(info.namespace) + "." + info.name,
                  info,
                ]),
              ),
            }).then((result) => {
              console.log("========= requestQuery", result);
              assert(
                result.type === "ok" && result.value === "test server name",
              );
              resolve();
            });
          },
          onError: (e) => {
            throw new Error("request query test の サーバー内でエラーが発生した " + e);
          },
        });
      } finally {
        abortController.abort();
      }
    }),
);

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
              originHint: "http://0.0.0.0:5002",
            },
            simpleRequest,
          );
          if (simpleResponse === undefined) {
            throw new Error("definy RPC で処理するはずのところを無視した");
          }
          return simpleResponseToResponse(simpleResponse);
        }, {
          port: 5002,
          signal: abortController.signal,
          onListen: () => {
            name({ url: new URL("http://localhost:5002") }).then((result) => {
              console.log("result===", result);
              assert(
                result.type === "ok" && result.value === "test server name",
              );
              resolve();
            });
          },
          onError: (e) => {
            throw new Error("name test の サーバー内でエラーが発生した " + e);
          },
        });
      } finally {
        abortController.abort();
      }
    }),
);
*/
