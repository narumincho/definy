import { denoPlugin, esbuild, fast_base64, path } from "../deps.ts";
import { hashBinary } from "../sha256.ts";
import { jsonStringify } from "../typedJson.ts";
import { writeTextFile } from "../writeFileAndLog.ts";

type BuildClientResult = {
  readonly iconHash: string;
  readonly iconContent: string;
  readonly scriptHash: string;
  readonly scriptContent: string;
};

const clientEditorPath = path.fromFileUrl(
  import.meta.resolve("./clientEditor/"),
);

const buildClientEditor = async (): Promise<BuildClientResult> => {
  const iconContent = await Deno.readFile(
    path.join(clientEditorPath, "./assets/icon.png"),
  );
  const iconHash = await hashBinary(iconContent);

  const esbuildResult = await esbuild.build({
    entryPoints: [
      path.relative(Deno.cwd(), path.join(clientEditorPath, "./main.tsx")),
    ],
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
        iconContent: await fast_base64.toBase64(iconContent),
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
    path.fromFileUrl(import.meta.resolve("./server/browserClient.json")),
    jsonStringify(clientBuildResult, true),
  );
  console.log("ファイルに保存した");
  Deno.exit();
};

main();
