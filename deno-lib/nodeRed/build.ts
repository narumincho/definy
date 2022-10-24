import * as esbuild from "https://deno.land/x/esbuild@v0.15.12/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { build, emptyDir } from "https://deno.land/x/dnt@0.31.0/mod.ts";

const generateClientHtml = async (): Promise<string> => {
  const result = await esbuild.build({
    plugins: [denoPlugin()],
    entryPoints: ["./nodeRed/client/main.tsx"],
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

emptyDir("../nodeRedServerForNode");

const version = "1.0.4";

await build({
  entryPoints: ["./nodeRed/server/main.ts"],
  outDir: "../nodeRedServerForNode",
  shims: {
    deno: true,
    undici: true,
  },
  package: {
    name: "@definy/node-red",
    version,
    description: "definy RPC client for Node RED",
    author: "narumincho",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/narumincho/definy.git",
    },
    bugs: {
      url: "https://github.com/narumincho/definy/discussions",
    },
    "node-red": {
      nodes: {
        "send-to-definy": "./script/server.js",
      },
    },
    keywords: ["node-red"],
  },
  skipSourceOutput: true,
  typeCheck: false,
  declaration: false,
  esModule: false,
  test: false,
});

console.log("Node.js 向けスクリプトの出力に成功");

const clientHtml = await generateClientHtml();
await Deno.writeTextFile(
  "../nodeRedServerForNode/script/server.html",
  clientHtml
);
console.log("HTML ファイルの出力に成功");

await Deno.writeTextFile(
  "../nodeRedServerForNode/README.md",
  `# @definy/node-red v${version}

- npm latest: https://www.npmjs.com/package/@definy/node-red
- npm v${version}: https://www.npmjs.com/package/@definy/node-red/v/${version}

node-RED から definy にデータを送れるようにしたいー
`
);
console.log("README.md ファイルの出力に成功");

Deno.exit();
