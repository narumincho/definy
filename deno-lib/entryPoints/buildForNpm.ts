import { build, emptyDir } from "https://deno.land/x/dnt@0.32.0/mod.ts";
import { fromFileUrl } from "https://deno.land/std@0.177.0/path/mod.ts";
import { collectTsOrTsxFilePath } from "../collectTsOrTsxFilePath.ts";
import { relative } from "https://deno.land/std@0.177.0/path/posix.ts";

const outDir = new URL("../npm", import.meta.url);

await emptyDir(new URL(outDir));

const pathList: string[] = [
  ...await collectTsOrTsxFilePath(
    new URL("../", import.meta.url),
    new Set([
      "/nodeRedPackage",
      "/entryPoints",
      "/npm",
      "/definyApp",
      "/definyRpc/core/generate.ts",
    ]),
  ),
].map((path) => {
  return "./" + relative(import.meta.resolve("../"), path);
});

await build({
  entryPoints: pathList,
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
  mappings: {
    "https://esm.sh/prettier@2.7.1?pin=v102": {
      name: "prettier",
      version: "^2.7.1",
    },
    "https://esm.sh/prettier@2.7.1/parser-typescript?pin=v102": {
      name: "prettier",
      version: "^2.7.1",
      subPath: "parser-typescript.js",
    },
    "https://esm.sh/react@18.2.0?pin=v102": {
      name: "react",
      version: "^18.2.0",
    },
    "https://esm.sh/react-dom@18.2.0/client?pin=v102": {
      name: "react-dom",
      version: "^18.2.0",
      subPath: "client.js",
    },
    "https://esm.sh/react-dom@18.2.0/server?pin=v102": {
      name: "react-dom",
      version: "^18.2.0",
      subPath: "server.js",
    },
  },
  typeCheck: false,
  test: false,
});
