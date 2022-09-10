import { definyRpc } from "./mod.ts";

const sampleDefinyRpcServer = definyRpc.createHttpServer({
  hello: definyRpc.query({
    input: definyRpc.string,
    output: definyRpc.number,
    description: "",
    resolve: () => {
      return "ok";
    },
  }),
});
