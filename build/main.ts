import * as d from "../data";
import * as esbuild from "esbuild";
import * as fileSystem from "fs-extra";
import * as ts from "typescript";
import { generateCodeAsString, identifer } from "../gen/jsTs/main";

const clientSourceEntryPath = "./client/main.ts";
const functionsSourceEntryPath = "./functions/main.ts";
const distributionPath = "./distribution";
const functionsDistributionPath = `${distributionPath}/functions`;
const hostingDistributionPath = `${distributionPath}/hosting`;

/**
 * Firebase へ デプロイするためにビルドする
 */
export const build = async (mode: d.Mode): Promise<void> => {
  await outputPackageJsonForFunctions();
  await outputNowMode(mode);
  await generateFirebaseJson(mode);

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

const generateFirebaseJson = (mode: d.Mode): Promise<void> => {
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
            source: "/sitemap",
            function: "sitemap",
          },
          {
            source: "/api/**",
            function: "api",
          },
          {
            source: "/logInCallback/**",
            function: "logInCallback",
          },
          {
            source: "/pngFile/**",
            function: "pngFile",
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
        mode === d.Mode.Release
          ? undefined
          : {
              functions: {
                port: 5001,
              },
              firestore: {
                port: 8080,
              },
              hosting: {
                port: 2520,
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
    "fs-extra",
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

const outputNowMode = async (mode: d.Mode): Promise<void> => {
  await fileSystem.outputFile(
    "./out.ts",
    generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Variable({
            name: identifer.fromString("nowMode"),
            document: "実行モード (ビルド時にコード生成される)",
            expr: d.TsExpr.Get({
              expr: d.TsExpr.ImportedVariable({
                moduleName: "./data",
                name: identifer.fromString("Mode"),
              }),
              propertyExpr: d.TsExpr.StringLiteral(mode),
            }),
            type: d.TsType.ImportedType({
              moduleName: "./data",
              name: identifer.fromString("Mode"),
            }),
          }),
        ],
        statementList: [],
      },
      d.CodeType.TypeScript
    )
  );
};
