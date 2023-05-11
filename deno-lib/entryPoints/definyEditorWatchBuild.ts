import { Hash, hashBinary } from "../sha256.ts";
import { jsonStringify } from "../typedJson.ts";
import { writeTextFileWithLog } from "../writeFileAndLog.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.15.14/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { fromFileUrl } from "https://deno.land/std@0.186.0/path/posix.ts";
import { toBase64 } from "https://deno.land/x/fast_base64@v0.1.7/mod.ts";

type BuildClientResult = {
  readonly iconHash: Hash;
  readonly iconContent: string;
  readonly scriptHash: Hash;
  readonly scriptContent: string;
  readonly fontHash: Hash;
  readonly fontContent: string;
  readonly notoSansContent: string;
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

const assetsFolder = new URL(
  "../definyApp/editor/assets/",
  import.meta.url,
);

const watchAndBuild = async (
  onBuild: (result: BuildClientResult) => void,
): Promise<void> => {
  const iconContent = await (await fetch(
    new URL("./icon.png", assetsFolder),
  )).arrayBuffer();
  const iconHash = await hashBinary(iconContent);
  const iconContentAsBase64 = await toBase64(iconContent);

  const fontContent = await (await fetch(
    new URL("./hack_regular_subset.woff2", assetsFolder),
  )).arrayBuffer();
  const fontHash = await hashBinary(fontContent);
  const fontContentAsBase64 = await toBase64(fontContent);

  const notoSans = await (await fetch(
    new URL("./NotoSansJP-Regular.otf", assetsFolder),
  )).arrayBuffer();
  const notoSansAsBase64 = await toBase64(notoSans);

  const scriptHashAndContent = await outputFilesToScriptFile(
    (await esbuild.build({
      entryPoints: [
        fromFileUrl(
          import.meta.resolve("./definyEditorInBrowser.tsx"),
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
                notoSansContent: notoSansAsBase64,
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
    notoSansContent: notoSansAsBase64,
  });
};

const editorWatchBuild = async (): Promise<void> => {
  await watchAndBuild((clientBuildResult) => {
    writeTextFileWithLog(
      new URL("../definyApp/server/dist.json", import.meta.url),
      jsonStringify(clientBuildResult, true),
    );
  });
};

editorWatchBuild();
