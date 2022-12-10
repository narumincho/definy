import { startExampleServer } from "../definyRpc/example/serve.ts";

startExampleServer({
  portNumber: 2520,
  codeGenOutputFolderPath: new URL(
    import.meta.resolve("../definyRpc/example/generated"),
  ),
});
