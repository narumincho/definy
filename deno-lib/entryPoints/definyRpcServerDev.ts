import { startExampleServer } from "../definyRpc/example/serve.ts";

startExampleServer({
  portNumber: 2520,
  codeGenOutputFolderPath: new URL(
    "../definyRpc/example/generated/",
    import.meta.url,
  ),
});
