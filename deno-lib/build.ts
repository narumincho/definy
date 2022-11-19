import { fromFileUrl } from "https://deno.land/std@0.156.0/path/mod.ts";
import * as dnt from "https://deno.land/x/dnt@0.31.0/mod.ts";

await dnt.emptyDir(fromFileUrl(import.meta.resolve("./npm")));
await dnt.build({
  entryPoints: [fromFileUrl(import.meta.resolve("./mod.ts"))],
  outDir: fromFileUrl(import.meta.resolve("./npm")),
  shims: {
    deno: true,
    undici: true,
  },
  typeCheck: false,
  package: {
    name: "deno-lib",
    version: "0.0.0",
    description: "deno code for definy",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/narumincho/definy.git",
    },
    bugs: {
      url: "https://github.com/narumincho/definy/discussions",
    },
  },
  skipSourceOutput: true,
  mappings: {
    "https://cdn.skypack.dev/faunadb@4.7.1?dts": {
      name: "faunadb",
      version: "4.7.1",
      peerDependency: false,
    },
    "https://deno.land/x/zod@v3.19.1/mod.ts": {
      name: "zod",
      version: "3.19.1",
    },
    "https://esm.sh/prettier@2.7.1": {
      name: "prettier",
      version: "2.7.1",
    },
    "https://esm.sh/prettier@2.7.1/parser-typescript": {
      name: "prettier",
      subPath: "parser-typescript.js",
      version: "2.7.1",
    },
  },
});
