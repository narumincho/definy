import { build, emptyDir } from "https://deno.land/x/dnt@0.31.0/mod.ts";

await emptyDir("./npm");
await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
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
    "https://cdn.skypack.dev/faunadb@4.7.0?dts": {
      name: "faunadb",
      version: "4.7.0",
      peerDependency: false,
    },
    "https://deno.land/x/zod@v3.19.1/mod.ts": {
      name: "zod",
      version: "3.19.1",
    },
  },
});
