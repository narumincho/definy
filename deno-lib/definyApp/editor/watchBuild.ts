import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.15.13/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { hashBinary } from "../../sha256.ts";
import { jsonStringify } from "../../typedJson.ts";
import { fromFileUrl } from "https://deno.land/std@0.163.0/path/mod.ts";
import { relative } from "https://deno.land/std@0.163.0/path/win32.ts";
import { writeTextFile } from "../../writeFileAndLog.ts";

type BuildClientResult = {
  readonly iconHash: string;
  readonly iconContent: string;
  readonly scriptHash: string;
  readonly scriptContent: string;
};

const outputFilesToScriptFile = async (
  outputFiles: ReadonlyArray<esbuild.OutputFile>,
): Promise<{ readonly hash: string; readonly scriptContent: string }> => {
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
      format: "esm",
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
                iconContent: base64.fromUint8Array(iconContent),
                iconHash,
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
    iconContent: base64.fromUint8Array(iconContent),
    iconHash,
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
