import * as esbuild from "esbuild";
import { promises as fileSystem } from "fs";

const distributionPath = "./distribution";

fileSystem.rename("./static", distributionPath).catch((e) => {
  throw e;
});

esbuild
  .build({
    entryPoints: ["source/main.ts"],
    bundle: true,
    outdir: distributionPath,
    define: {
      "process.env.NODE_ENV": `"production"`,
    },
    sourcemap: true,
    minify: true,
    target: ["chrome88", "firefox85", "safari14"],
  })
  .catch((e) => {
    throw e;
  });

fileSystem
  .rename(`${distributionPath}/icon.png`, `${distributionPath}/icon`)
  .catch((e) => {
    throw e;
  });
