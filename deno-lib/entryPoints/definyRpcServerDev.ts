import { fromFileUrl } from "https://deno.land/std@0.167.0/path/mod.ts";
import { startExampleServer } from "../definyRpc/example/serve.ts";

startExampleServer({
  portNumber: 2520,
  codeGenOutputFolderPath: fromFileUrl(
    import.meta.resolve("../definyRpc/example/generated"),
  ),
});
