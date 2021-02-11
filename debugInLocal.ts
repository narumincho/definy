import * as esbuild from "esbuild";
import { fastify } from "fastify";
import { promises as fileSystem } from "fs";

const devServer = fastify({ logger: true });

const scriptFileName = "script.js";
const scriptPath = `/${scriptFileName}`;
const fontPath = "/font";
const iconPath = "/icon";

devServer.get(fontPath, async (request, reply) => {
  const fontBinary = await fileSystem.readFile(
    "./static/hack-regular-subset.woff2"
  );
  reply.type("font/woff2");
  return fontBinary;
});

devServer.get(iconPath, async (request, reply) => {
  const fontBinary = await fileSystem.readFile("./static/icon.png");
  reply.type("image/png");
  return fontBinary;
});

devServer.get(scriptPath, async (request, reply) => {
  reply.type("text/javascript");
  return Buffer.from(await build(false));
});

devServer.get(`${scriptPath}.map`, async (request, reply) => {
  reply.type("text/javascript");
  return Buffer.from(await build(true));
});

const build = async (isMapFile: boolean) => {
  const result = await esbuild
    .build({
      entryPoints: ["source/main.ts"],
      bundle: true,
      outfile: scriptFileName,
      define: {
        "process.env.NODE_ENV": `"development"`,
      },
      sourcemap: true,
      target: ["chrome88", "firefox85", "safari14"],
      write: false,
    })
    .catch((e) => {
      console.error(e);
      throw e;
    });
  for (const out of result.outputFiles) {
    if (isMapFile && out.path.endsWith(".map")) {
      return out.contents;
    }
    if (!isMapFile && out.path.endsWith(".js")) {
      return out.contents;
    }
  }
  throw devServer.log.error(`unknown script path. in development server`);
};

// eslint-disable-next-line require-await
devServer.get("/**", async (request, reply) => {
  reply.type("text/html");
  return `<!doctype html>
<!-- for debug -->
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Definy</title>
    <link rel="icon" href="${iconPath}">
    <meta name="description" content="ブラウザで動作する革新的なプログラミング言語">
    <style>
        /*
            Hack typeface https://github.com/source-foundry/Hack
            License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
        */

        @font-face {
            font-family: "Hack";
            font-weight: 400;
            font-style: normal;
            src: url("${fontPath}") format("woff2");
        }

        html {
            height: 100%;
        }

        body {
            height: 100%;
            margin: 0;
            background-color: black;
            display: grid;
            color: white;
        }

        * {
            box-sizing: border-box;
        }
    </style>
    <script defer src="${scriptPath}"></script>
</head>

<body>
    読み込み中……
</body>

</html>
`;
});

const start = async () => {
  try {
    await devServer.listen(2520);
  } catch (err) {
    devServer.log.error(err);
    process.exit(1);
  }
};
start();
console.log("open in http://localhost:2520");
