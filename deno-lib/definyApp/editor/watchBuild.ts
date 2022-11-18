import { Hash, hashBinary } from "../../sha256.ts";
import { jsonStringify } from "../../typedJson.ts";
import { writeTextFile } from "../../writeFileAndLog.ts";
import { denoPlugin, esbuild, fast_base64, path } from "../../deps.ts";

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

const watchAndBuild = async (
  onBuild: (result: BuildClientResult) => void,
): Promise<void> => {
  const iconContent = await Deno.readFile(
    path.fromFileUrl(import.meta.resolve("./assets/icon.png")),
  );
  const iconHash = await hashBinary(iconContent);
  const iconContentAsBase64 = await fast_base64.toBase64(iconContent);

  const fontContent = await Deno.readFile(
    path.fromFileUrl(import.meta.resolve("./assets/hack_regular_subset.woff2")),
  );
  const fontHash = await hashBinary(fontContent);
  const fontContentAsBase64 = await fast_base64.toBase64(fontContent);

  const notoSans = await Deno.readFile(
    path.fromFileUrl(import.meta.resolve("./assets/NotoSansJP-Regular.otf")),
  );
  const notoSansAsBase64 = await fast_base64.toBase64(notoSans);

  const scriptHashAndContent = await outputFilesToScriptFile(
    (await esbuild.build({
      entryPoints: [
        path.relative(
          Deno.cwd(),
          path.fromFileUrl(import.meta.resolve("./start.tsx")),
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

const main = async (): Promise<void> => {
  await watchAndBuild((clientBuildResult) => {
    writeTextFile(
      path.fromFileUrl(import.meta.resolve("../editorServer/dist.json")),
      jsonStringify(clientBuildResult, true),
    );
  });
};

main();
