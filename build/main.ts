import * as esbuild from "esbuild";
import * as fileSystem from "fs-extra";

const distributionPath = "./distribution";

/**
 * Firebase へ デプロイするためにビルドする
 */
export const build = async (): Promise<void> => {
  await fileSystem.copy("./static", distributionPath);

  await esbuild.build({
    entryPoints: ["source/main.ts"],
    bundle: true,
    outdir: distributionPath,
    define: {
      "process.env.NODE_ENV": `"production"`,
    },
    sourcemap: true,
    minify: true,
    target: ["chrome88", "firefox85", "safari14"],
  });

  await fileSystem
    .rename(`${distributionPath}/icon.png`, `${distributionPath}/icon`)
    .catch((e) => {
      throw e;
    });
};
