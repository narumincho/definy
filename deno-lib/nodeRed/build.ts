import { denoPlugin, dnt, emptyDir, esbuild, path } from "../deps.ts";
import { writeTextFile } from "../writeFileAndLog.ts";

const generateClientHtml = async (): Promise<string> => {
  const result = await esbuild.build({
    plugins: [denoPlugin()],
    entryPoints: [
      path.relative(
        Deno.cwd(),
        path.fromFileUrl(import.meta.resolve("./client/main.tsx")),
      ),
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

const outDir = path.fromFileUrl(
  import.meta.resolve("../../nodeRedServerForNode"),
);

emptyDir(outDir);

const version = "1.1.0";

await dnt.build({
  entryPoints: [path.fromFileUrl(import.meta.resolve("./server/main.ts"))],
  outDir,
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
await writeTextFile(
  path.join(outDir, "./script/nodeRed/server/main.html"),
  clientHtml,
);

await writeTextFile(
  path.join(outDir, "./README.md"),
  `# @definy/node-red v${version}

- npm latest: https://www.npmjs.com/package/@definy/node-red
- npm v${version}: https://www.npmjs.com/package/@definy/node-red/v/${version}

node-RED から definy にデータを送れるようにしたいー

## できること
- create-definy-rpc-node という名前のノードにURLを入力し, デプロイボタンを押したあとにその APIを呼ぶノードが生成される
`,
);

Deno.exit();
