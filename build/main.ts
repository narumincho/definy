import * as esbuild from "esbuild";
import * as fileSystem from "fs-extra";
import * as d from "definy-core/source/data";
import * as ts from "typescript";
import { debugHostingPortNumber } from "../common/url";
import { generateCodeAsString } from "js-ts-code-generator";
import * as jsTsData from "js-ts-code-generator/data";
import * as jsTsIdentifer from "js-ts-code-generator/identifer";
import * as jsTsUtil from "js-ts-code-generator/util";
import * as common from "../common/url";

const clientSourceEntryPath = "./client/main.ts";
const functionsSourceEntryPath = "./functions/main.ts";
const distributionPath = "./distribution";
const functionsDistributionPath = `${distributionPath}/functions`;
const hostingDistributionPath = `${distributionPath}/hosting`;

/**
 * Firebase へ デプロイするためにビルドする
 */
export const build = async (clientMode: d.ClientMode): Promise<void> => {
  await outputPackageJsonForFunctions();
  await fileSystem.outputFile(
    "out.ts",
    generateCodeAsString(
      {
        exportDefinitionList: [
          jsTsData.ExportDefinition.Variable({
            name: jsTsIdentifer.fromString("scriptUrl"),
            document:
              "メインのスクリプトのURL (ビルド時にこの変数の値が変更される)",
            expr: jsTsData.Expr.New({
              expr: jsTsData.Expr.GlobalObjects(
                jsTsIdentifer.fromString("URL")
              ),
              parameterList: [
                jsTsData.Expr.StringLiteral(
                  `${common.clientModeToOriginUrl(clientMode)}main.js`
                ),
              ],
            }),
            type: jsTsData.Type.ScopeInGlobal(jsTsIdentifer.fromString("URL")),
          }),
        ],
        statementList: [],
      },
      jsTsData.CodeType.TypeScript
    )
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
    entryPoints: [clientSourceEntryPath],
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

const outputPackageJsonForFunctions = async (): Promise<void> => {
  const packageJson: {
    devDependencies: Record<string, string>;
  } = await fileSystem.readJSON("package.json");
  const packageNameUseInFunctions = [
    "@narumincho/html",
    "firebase-admin",
    "firebase-functions",
    "axios",
    "definy-core",
    "jimp",
    "jsonwebtoken",
  ];

  await fileSystem.outputFile(
    `${functionsDistributionPath}/package.json`,
    JSON.stringify({
      name: "definy-functions",
      version: "1.0.0",
      description: "definy in Cloud Functions for Firebase",
      main: "functions/main.js",
      author: "narumincho",
      engines: { node: "14" },
      dependencies: Object.fromEntries(
        Object.entries(packageJson.devDependencies).flatMap(
          ([packageName, packageVersion]): ReadonlyArray<
            readonly [string, string]
          > =>
            packageNameUseInFunctions.includes(packageName)
              ? [[packageName, packageVersion]]
              : []
        )
      ),
    })
  );
};
