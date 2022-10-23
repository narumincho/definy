import * as esbuild from "https://deno.land/x/esbuild@v0.15.12/mod.js";

import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";

const buildClient = async (): Promise<string> => {
  const result = await esbuild.build({
    plugins: [denoPlugin()],
    entryPoints: ["./nodeRedPackageClient/content.tsx"],
    write: false,
    bundle: true,
    format: "esm",
  });

  for (const outFile of result.outputFiles) {
    if (outFile.path === "<stdout>") {
      const clientCode = new TextDecoder().decode(outFile.contents);
      return `<script type="text/javascript">
      ${clientCode}
    </script>
    
    <script type="text/html" data-template-name="send-to-definy">
      <div class="form-row">
        <label for="node-input-originUrl"><i class="icon-tag"></i>originUrl</label>
        <input
          type="text"
          id="node-input-originUrl"
          placeholder="https://narumincho-definy.deno.dev/"
          oninput="definyOriginUrlOnInput()"
        />
        <div id="definy-originUrl-validationResult"></div>
      </div>
    </script>
    
    <script type="text/html" data-help-name="send-to-definy">
      <p>definy for Node RED</p>
    </script>`;
    }
  }
  throw new Error("client の ビルドに失敗した");
};

const clientHtml = await buildClient();
await Deno.writeTextFile("./nodeRedPackage", clientHtml);
