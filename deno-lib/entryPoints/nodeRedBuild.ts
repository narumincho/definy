import { writeTextFileWithLog } from "../writeFileAndLog.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.15.14/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { fromFileUrl as fromFileUrlPosix } from "https://deno.land/std@0.173.0/path/posix.ts";
import { fromFileUrl } from "https://deno.land/std@0.173.0/path/mod.ts";
import { build, emptyDir } from "https://deno.land/x/dnt@0.32.0/mod.ts";

const generateClientHtml = async (): Promise<string> => {
  const result = await esbuild.build({
    plugins: [denoPlugin()],
    entryPoints: [
      fromFileUrlPosix(import.meta.resolve("../nodeRed/client/main.tsx")),
    ],
    write: false,
    bundle: true,
    format: "esm",
    target: ["chrome106"],
  });

  for (const outFile of result.outputFiles) {
    if (outFile.path === "<stdout>") {
      const clientCode = new TextDecoder().decode(outFile.contents);
      return `<script type="module">${clientCode}</script>

<script type="text/html" data-template-name="create-definy-rpc-node">
  <div id="definy-form-root"></div>
</script>

<script type="text/html" data-help-name="create-definy-rpc-node">
  <p>definy RPC のサーバーに接続するためのノードを作成する</p>
</script>

<div id="definy-html-output"></div>
`;
    }
  }
  throw new Error("client の ビルドに失敗した");
};

const outDir = new URL("../nodeRedPackage/", import.meta.url);

await emptyDir(outDir);

const version = "1.2.0";

const entry = import.meta.resolve("../nodeRed/server/main.ts");

console.log(entry.toString(), fromFileUrl(entry));

await build({
  entryPoints: [fromFileUrl(entry)],
  outDir: fromFileUrl(outDir),
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
await writeTextFileWithLog(
  new URL("./script/nodeRed/server/main.html", outDir),
  clientHtml,
);

await writeTextFileWithLog(
  new URL("./README.md", outDir),
  `# @definy/node-red v${version}

- npm latest: https://www.npmjs.com/package/@definy/node-red
- npm v${version}: https://www.npmjs.com/package/@definy/node-red/v/${version}
- node red flow: https://flows.nodered.org/node/@definy/node-red

node-RED から definy にデータを送れるようにしたいー

## できること
- create-definy-rpc-node という名前のノードにURLを入力し, デプロイボタンを押したあとにその APIを呼ぶノードが生成される
`,
);

Deno.exit();
