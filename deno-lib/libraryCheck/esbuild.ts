import * as esbuild from "https://deno.land/x/esbuild@v0.15.12/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";

const handleBuildResult = (result: esbuild.BuildResult | null) => {
  result?.outputFiles?.forEach((file) => {
    if (file.path === "<stdout>") {
      console.log("ビルドに成功!");
      Deno.writeTextFile(
        "./out.js",
        JSON.stringify({
          scriptContent: new TextDecoder().decode(file.contents),
        })
      );
    }
  });
};

console.log("esbuild を起動中...");
handleBuildResult(
  await esbuild.build({
    entryPoints: ["./libraryCheck/react.tsx"],
    plugins: [denoPlugin()],
    write: false,
    bundle: true,
    watch: {
      onRebuild: (error, result) => {
        console.log(result, error);
      },
    },
    format: "esm",
    target: ["chrome106"],
  })
);

console.log("終了");
