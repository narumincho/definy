import * as esbuild from "https://deno.land/x/esbuild@v0.15.13/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { jsonStringify } from "../typedJson.ts";
import { writeTextFile } from "../writeFileAndLog.ts";

// esbuild が動作するか確かめている

const handleBuildResult = (result: esbuild.BuildResult | null) => {
  result?.outputFiles?.forEach((file) => {
    if (file.path === "<stdout>") {
      writeTextFile(
        "./out.js",
        jsonStringify({
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