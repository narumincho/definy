import { serve } from "https://deno.land/std@0.157.0/http/server.ts";
import { definyRpc } from "../server/mod.ts";

const portNumber = 2520;

const sampleDefinyRpcServer = definyRpc.createHttpServer({
  name: "example",
  all: () => [
    definyRpc.createApiFunction({
      fullName: ["hello"],
      description: "hello と挨拶が返ってくる",
      needAuthentication: false,
      isMutation: false,
      input: definyRpc.unit,
      output: definyRpc.string,
      resolve: () => {
        return "hello";
      },
    }),
    definyRpc.createApiFunction({
      fullName: ["now"],
      description: "現在時刻を文字列で返す",
      needAuthentication: false,
      isMutation: false,
      input: definyRpc.unit,
      output: definyRpc.string,
      resolve: () => {
        return new Date().toISOString();
      },
    }),
    definyRpc.createApiFunction({
      fullName: ["repeat"],
      description: '"ok"を指定した回数分繰り返して返す',
      needAuthentication: false,
      isMutation: false,
      input: definyRpc.number,
      output: definyRpc.string,
      resolve: (input) => {
        return "ok".repeat(input);
      },
    }),
  ],
  originHint: `http://localhost:${portNumber}`,
  codeGenOutputFolderPath: "./definy-rpc/browserClient/src/generated",
});

serve(
  async (request) => {
    const response = await sampleDefinyRpcServer(request);

    response.headers.append(
      "access-control-allow-origin",
      request.headers.get("origin") ?? new URL(request.url).origin
    );
    return response;
  },
  { port: portNumber }
);
