import * as esbuild from "https://deno.land/x/esbuild@v0.15.13/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { build, emptyDir } from "https://deno.land/x/dnt@0.31.0/mod.ts";

const generateClientHtml = async (): Promise<string> => {
  const result = await esbuild.build({
    plugins: [denoPlugin()],
    entryPoints: ["./deno-lib/nodeRed/client/main.tsx"],
    write: false,
    bundle: true,
    format: "esm",
    target: ["chrome106"],
  });

  for (const outFile of result.outputFiles) {
    if (outFile.path === "<stdout>") {
      const clientCode = new TextDecoder().decode(outFile.contents);
      return `<script type="module">
  (()=>{${clientCode}})()
</script>

<script type="text/html" data-template-name="create-definy-rpc-node">
  <div id="definy-form-root"></div>
</script>

<script type="text/html" data-help-name="create-definy-rpc-node">
  <p>definy RPC のサーバーに接続するためのノードを作成する</p>
</script>
`;
    }
  }
  throw new Error("client の ビルドに失敗した");
};

emptyDir("./nodeRedServerForNode");

const version = "1.0.6";

await build({
  entryPoints: ["./deno-lib/nodeRed/server/main.ts"],
  outDir: "./nodeRedServerForNode",
  shims: {
    deno: true,
    undici: true,
  },
  mappings: {},
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
        "create-definy-rpc-node": "./script/nodeRed/server/main.js",
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
  "./nodeRedServerForNode/script/nodeRed/server/main.html",
  clientHtml
);
console.log("HTML ファイルの出力に成功");

await Deno.writeTextFile(
  "./nodeRedServerForNode/README.md",
  `# @definy/node-red v${version}

- npm latest: https://www.npmjs.com/package/@definy/node-red
- npm v${version}: https://www.npmjs.com/package/@definy/node-red/v/${version}

node-RED から definy にデータを送れるようにしたいー

## できること
- create-definy-rpc-node という名前のノードにURLを入力するとそのURLでHTTP サーバーが起動しているかわかる (デプロイボタンをいちいち押さなくても良い!)
- /definy のパス ( http://127.0.0.1:1880/definy など) で definy RPC の起動がされる
`
);
console.log("README.md ファイルの出力に成功");

Deno.exit();
