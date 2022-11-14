import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.15.13/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { Hash, hashBinary } from "../../sha256.ts";
import { jsonStringify } from "../../typedJson.ts";
import { fromFileUrl } from "https://deno.land/std@0.164.0/path/mod.ts";
import { relative } from "https://deno.land/std@0.164.0/path/mod.ts";
import { writeTextFile } from "../../writeFileAndLog.ts";

type BuildClientResult = {
  readonly iconHash: Hash;
  readonly iconContent: string;
  readonly scriptHash: Hash;
  readonly scriptContent: string;
  readonly fontHash: Hash;
  readonly fontContent: string;
};

const outputFilesToScriptFile = async (
  outputFiles: ReadonlyArray<esbuild.OutputFile>,
): Promise<{ readonly hash: Hash; readonly scriptContent: string }> => {
  for (const esbuildResultFile of outputFiles) {
    if (esbuildResultFile.path === "<stdout>") {
      const hash = await hashBinary(esbuildResultFile.contents);
      console.log("js 発見");
      const scriptContent = new TextDecoder().decode(
        esbuildResultFile.contents,
      );
      return {
        hash,
        scriptContent,
      };
    }
  }
  throw new Error("esbuild で <stdout> の出力を取得できなかった...");
};

const watchAndBuild = async (
  onBuild: (result: BuildClientResult) => void,
): Promise<void> => {
  const iconContent = await Deno.readFile(
    fromFileUrl(import.meta.resolve("./assets/icon.png")),
  );
  const iconHash = await hashBinary(iconContent);
  const iconContentAsBase64 = base64.fromUint8Array(iconContent);

  const fontContent = await Deno.readFile(
    fromFileUrl(import.meta.resolve("./assets/hack_regular_subset.woff2")),
  );
  const fontHash = await hashBinary(fontContent);
  const fontContentAsBase64 = base64.fromUint8Array(fontContent);

  const scriptHashAndContent = await outputFilesToScriptFile(
    (await esbuild.build({
      entryPoints: [
        relative(
          Deno.cwd(),
          fromFileUrl(import.meta.resolve("./start.tsx")),
        ),
      ],
      plugins: [denoPlugin()],
      write: false,
      bundle: true,
      minify: true,
      format: "iife",
      target: ["chrome106"],
      watch: {
        onRebuild: (error, result) => {
          if (error) {
            console.error(error);
          }
          if (result !== null) {
            outputFilesToScriptFile(
              result.outputFiles ?? [],
            ).then((hashAndContent) => {
              onBuild({
                iconHash,
                iconContent: iconContentAsBase64,
                fontHash,
                fontContent: fontContentAsBase64,
                scriptHash: hashAndContent.hash,
                scriptContent: hashAndContent.scriptContent,
              });
            });
          }
        },
      },
    })).outputFiles,
  );
  onBuild({
    iconHash,
    iconContent: iconContentAsBase64,
    fontHash,
    fontContent: fontContentAsBase64,
    scriptHash: scriptHashAndContent.hash,
    scriptContent: scriptHashAndContent.scriptContent,
  });
};

const main = async (): Promise<void> => {
  await watchAndBuild((clientBuildResult) => {
    writeTextFile(
      fromFileUrl(import.meta.resolve("../editorServer/dist.json")),
      jsonStringify(clientBuildResult, true),
    );
  });
};

main();
