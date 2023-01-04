import { fromFileUrl } from "https://deno.land/std@0.170.0/path/posix.ts";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { build as esBuild } from "https://deno.land/x/esbuild@v0.15.14/mod.js";
import { jsonStringify } from "../typedJson.ts";
import { writeTextFileWithLog } from "../writeFileAndLog.ts";

const distributionPath = new URL(
  import.meta.resolve("../vscodeExtensionDistribution/"),
);

const build = async (): Promise<string> => {
  const esbuildResult = await esBuild({
    entryPoints: [
      fromFileUrl(
        new URL("./main.ts", import.meta.resolve("../vscodeExtension/main.ts")),
      ),
    ],
    plugins: [denoPlugin()],
    write: false,
    bundle: true,
    format: "cjs",
    target: ["node18"],
  });

  for (const esbuildResultFile of esbuildResult.outputFiles) {
    if (esbuildResultFile.path === "<stdout>") {
      console.log("js 発見");
      const scriptContent = new TextDecoder().decode(
        esbuildResultFile.contents,
      );

      return scriptContent;
    }
  }
  throw new Error("esbuild で <stdout> の出力を取得できなかった...");
};

const scriptRelativePath = "./main.js";
const languageConfigurationRelativePath = "./language-configuration.json";

writeTextFileWithLog(
  new URL(scriptRelativePath, distributionPath),
  await build(),
);

writeTextFileWithLog(
  new URL("./package.json", distributionPath),
  jsonStringify({
    "name": "definy",
    "version": "0.0.9",
    "description": "definy VSCode extension",
    "repository": {
      "url": "git+https://github.com/narumincho/definy.git",
      "type": "git",
    },
    "license": "MIT",
    "homepage": "https://github.com/narumincho/definy",
    "author": "narumincho",
    "engines": {
      "vscode": "^1.67.0",
    },
    "dependencies": {},
    "activationEvents": [
      "onLanguage:definy",
      "onCommand:definy.webview",
    ],
    "contributes": {
      "languages": [
        {
          "id": "definy",
          "icon": {
            "light": "./icon.png",
            "dark": "./icon.png",
          },
          "extensions": [
            ".definy",
          ],
          "configuration": languageConfigurationRelativePath,
        },
      ],
      "commands": [
        {
          "title": ".definy の拡張機能から webview を開きます",
          "command": "definy.webview",
        },
      ],
    },
    "browser": scriptRelativePath,
    "publisher": "narumincho",
    "icon": "icon.png",
  }),
);

writeTextFileWithLog(
  new URL(languageConfigurationRelativePath, distributionPath),
  jsonStringify({
    "surroundingPairs": [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
      ["'", "'"],
      ['"', '"'],
    ],
    "comments": { "blockComment": ["{-", "-}"] },
    "brackets": [["{", "}"], ["[", "]"], ["(", ")"]],
    "autoClosingPairs": [
      { "open": "{", "close": "}" },
      { "open": "[", "close": "]" },
      { "open": "(", "close": ")" },
      { "open": "'", "notIn": ["string", "comment"], "close": "'" },
      { "open": '"', "notIn": ["string"], "close": '"' },
      { "open": "///", "notIn": ["string"], "close": "///" },
    ],
  }),
);

writeTextFileWithLog(
  new URL("README.md", distributionPath),
  `# definy (VSCode 拡張機能版)

\`\`\`definy
module(
  "モジュールの説明文",
  body(
    part(oneAddOne, "1足す1は2", add(uint(1), uint(1))),
    part(five, 5, add(oneAddOne, uint(" 3"))),
  ),
)
\`\`\`

definy は シンプルさを重視した新しいプログラミング言語です.

まだまだ開発中であり, できることは限られます.

上のコードを書いた状態で, \`add\` にマウスをホバーすると評価結果を見ることができます.

## VSCode 拡張機能版 definy を作った理由

https://definy.app で完結するような開発環境を目指していたが

- 全文検索機能
- バージョン管理機能

の仕組みがない状態での開発は不便で, また 全文検索機能とバージョン管理機能を自作するのは時間がかかってしまうため. 一旦 普通のプログラミング言語と近いテキストで表現し, VSCode で編集するスタイルにした.

かと言って, definy の個性が失われたわけではない

- VSCode の拡張機能だけで環境構築が完了するため, 少ない準備ですぐに開発に取り組むことができる
- シンプルな構文のため解析が簡単であり, コードフォーマットができないエラーが発生しない
- そのほかの特徴は [Elm](https://elm-lang.org/) を参考にしている. 型クラスのないシンプルな純粋関数型
`,
);
