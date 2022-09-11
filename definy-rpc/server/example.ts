import { serve } from "https://deno.land/std@0.154.0/http/server.ts";
import { definyRpc } from "./mod.ts";

const sampleDefinyRpcServer = definyRpc.createHttpServer({
  name: "example",
  all: () => [
    definyRpc.createApiFunction({
      name: "hello",
      namespace: [],
      description: "hello と挨拶が返ってくる",
      isMutation: false,
      input: definyRpc.unit,
      output: definyRpc.string,
      resolve: () => {
        return "hello";
      },
    }),
    definyRpc.createApiFunction({
      name: "now",
      namespace: [],
      description: "現在時刻を文字列で返す",
      isMutation: false,
      input: definyRpc.unit,
      output: definyRpc.string,
      resolve: () => {
        return new Date().toISOString();
      },
    }),
    definyRpc.createApiFunction({
      name: "repeat",
      namespace: [],
      isMutation: false,
      input: definyRpc.number,
      output: definyRpc.string,
      description: '"ok"を指定した回数分繰り返して返す',
      resolve: (input) => {
        return "ok".repeat(input);
      },
    }),
  ],
});

serve(
  (request) => {
    const response = sampleDefinyRpcServer(request);

    response.headers.append(
      "access-control-allow-origin",
      request.headers.get("origin") ?? new URL(request.url).origin
    );
    return response;
  },
  { port: 2520 }
);
