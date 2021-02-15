import * as esbuild from "esbuild";
import * as fileSystem from "fs-extra";
import * as d from "definy-core/source/data";
import * as ts from "typescript";
import { debugHostingPortNumber } from "../common/main";

const clientSourceEntryPath = "./source/main.ts";
const functionsSourceEntryPath = "./functions/main.ts";
const distributionPath = "./distribution";
const functionsDistributionPath = `${distributionPath}/functions`;
const hostingDistributionPath = `${distributionPath}/hosting`;

/**
 * Firebase へ デプロイするためにビルドする
 */
export const build = async (clientMode: d.ClientMode): Promise<void> => {
  await fileSystem.outputFile(
    `${functionsDistributionPath}/package.json`,
    JSON.stringify({
      name: "definy-functions",
      version: "1.0.0",
      description: "definy in Cloud Functions for Firebase",
      main: "functions/main.js",
      author: "narumincho",
      engines: { node: "14" },
      dependencies: {
        "@narumincho/html": "0.2.3",
        "firebase-admin": "9.4.2",
        "firebase-functions": "3.13.1",
      },
    })
  );

  await generateFirebaseJson(clientMode);

  /** staticなファイルのコピー */
  await fileSystem.copy("./static", hostingDistributionPath);
  await fileSystem
    .rename(
      `${hostingDistributionPath}/icon.png`,
      `${hostingDistributionPath}/icon`
    )
    .catch((e) => {
      throw e;
    });

  await esbuild.build({
    entryPoints: ["source/main.ts"],
    bundle: true,
    outdir: hostingDistributionPath,
    define: {
      "process.env.NODE_ENV": `"production"`,
    },
    sourcemap: true,
    minify: true,
    target: ["chrome88", "firefox85", "safari14"],
  });

  buildFunctionsTypeScript();
};

const generateFirebaseJson = (clientMode: d.ClientMode): Promise<void> => {
  return fileSystem.outputFile(
    `firebase.json`,
    JSON.stringify({
      functions: {
        source: functionsDistributionPath,
      },
      hosting: {
        public: hostingDistributionPath,
        headers: [
          {
            source: "icon",
            headers: [
              {
                key: "content-type",
                value: "image/png",
              },
            ],
          },
        ],
        rewrites: [
          {
            source: "sitemap",
            function: "sitemap",
          },
          {
            source: "api/**",
            function: "api",
          },
          {
            source: "logInCallback/**",
            function: "logInCallback",
          },
          {
            source: "**",
            function: "html",
          },
        ],
        cleanUrls: true,
        trailingSlash: false,
      },
      emulators:
        clientMode === d.ClientMode.Release
          ? undefined
          : {
              functions: {
                port: 5001,
              },
              firestore: {
                port: 8080,
              },
              hosting: {
                port: debugHostingPortNumber,
              },
              ui: {
                enabled: true,
              },
            },
    })
  );
};

/**
 * Cloud Functions for Firebase の コードをビルドする
 *
 * TypeScript の 標準のコンパイラ tsc を使う
 */
const buildFunctionsTypeScript = (): void => {
  ts.createProgram({
    rootNames: [functionsSourceEntryPath],
    options: {
      target: ts.ScriptTarget.ES2020,
      forceConsistentCasingInFileNames: true,
      newLine: ts.NewLineKind.LineFeed,
      lib: ["DOM", "ES2020"],
      strict: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      module: ts.ModuleKind.CommonJS,
      outDir: functionsDistributionPath,
    },
  }).emit();
};
