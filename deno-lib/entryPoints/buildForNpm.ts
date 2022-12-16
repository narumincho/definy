import { build, emptyDir } from "https://deno.land/x/dnt@0.32.0/mod.ts";
import { collectTsOrTsxFilePath } from "./check.ts";
import { fromFileUrl } from "https://deno.land/std@0.168.0/path/mod.ts";

const outDir = new URL(import.meta.resolve("../npm/"));

await emptyDir(new URL(outDir));

await build({
  entryPoints: [
    ...await collectTsOrTsxFilePath(new URL(import.meta.resolve("../"))),
  ]
    .map(fromFileUrl),
  outDir: fromFileUrl(outDir),
  shims: { deno: true, undici: true },
  package: {
    name: "definy",
    version: "0.2.0",
    description: "definy deno-lib 部分",
    author: "narumincho",
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
});
