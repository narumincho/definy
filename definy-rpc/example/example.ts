import { serve } from "https://deno.land/std@0.159.0/http/server.ts";
import { definyRpc } from "../server/mod.ts";
import { funcList } from "./exampleFunc.ts";

const portNumber = 2520;

const sampleDefinyRpcServer = definyRpc.createHttpServer({
  name: "example",
  all: funcList,
  originHint: `https://narumincho-definy.deno.dev`,
  codeGenOutputFolderPath: undefined,
});

serve(
  (request) => {
    return sampleDefinyRpcServer(request);
  },
  { port: portNumber }
);
