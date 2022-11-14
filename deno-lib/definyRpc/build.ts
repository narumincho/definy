import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.15.13/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { hashBinary } from "../sha256.ts";
import { jsonStringify } from "../typedJson.ts";
import { fromFileUrl, join } from "https://deno.land/std@0.164.0/path/mod.ts";
import { relative } from "https://deno.land/std@0.164.0/path/mod.ts";
import { writeTextFile } from "../writeFileAndLog.ts";

type BuildClientResult = {
  readonly iconHash: string;
  readonly iconContent: string;
  readonly scriptHash: string;
  readonly scriptContent: string;
};

const clientEditorPath = fromFileUrl(import.meta.resolve("./clientEditor/"));

const buildClientEditor = async (): Promise<BuildClientResult> => {
  const iconContent = await Deno.readFile(
    join(clientEditorPath, "./assets/icon.png"),
  );
  const iconHash = await hashBinary(iconContent);

  const esbuildResult = await esbuild.build({
    entryPoints: [relative(Deno.cwd(), join(clientEditorPath, "./main.tsx"))],
    plugins: [denoPlugin()],
    write: false,
    bundle: true,
    format: "esm",
    target: ["chrome106"],
  });

  for (const esbuildResultFile of esbuildResult.outputFiles) {
    if (esbuildResultFile.path === "<stdout>") {
      const hash = await hashBinary(esbuildResultFile.contents);
      console.log("js 発見");
      const scriptContent = new TextDecoder().decode(
        esbuildResultFile.contents,
      );

      return {
        iconContent: base64.fromUint8Array(iconContent),
        iconHash,
        scriptHash: hash,
        scriptContent: scriptContent,
      };
    }
  }
  throw new Error("esbuild で <stdout> の出力を取得できなかった...");
};

const main = async (): Promise<void> => {
  const clientBuildResult = await buildClientEditor();
  console.log("clientEditor のビルドデータ生成完了");
  await writeTextFile(
    fromFileUrl(import.meta.resolve("./server/browserClient.json")),
    jsonStringify(clientBuildResult, true),
  );
  console.log("ファイルに保存した");
  Deno.exit();
};

main();
