import * as d from "../data";
import * as esbuild from "esbuild";
import * as fileSystem from "fs-extra";
import * as packageJsonGen from "../gen/packageJson/main";
import * as ts from "typescript";
import { generateCodeAsString, identifer } from "../gen/jsTs/main";

const clientSourceEntryPath = "./client/main.tsx";
const functionsSourceEntryPath = "./functions/main.ts";
const distributionPath = "./distribution";
const functionsDistributionPath = `${distributionPath}/functions`;
const hostingDistributionPath = `${distributionPath}/hosting`;
const firestoreRulesFilePath = `${distributionPath}/firestore.rules`;

/**
 * Firebase へ デプロイするためにビルドする
 */
export const build = async (mode: d.Mode): Promise<void> => {
  await fileSystem.remove(distributionPath);
  console.log(`${distributionPath}をすべて削除完了!`);
  if (mode === "Develop") {
    await fileSystem.copy(
      "../secret/definy.json",
      `${functionsDistributionPath}/.runtimeconfig.json`
    );
    console.log(
      `.runtimeconfig.json サーバーの秘密情報をローカルファイルからコピー完了`
    );
  }

  await outputPackageJsonForFunctions();
  console.log(`package.json を出力完了!`);
  await outputNowMode(mode);
  console.log(`out.ts を出力完了!`);
  await generateFirestoreRules();
  console.log(
    `Firestore 向けセキュリティールール (${firestoreRulesFilePath}) を出力完了!`
  );
  await generateFirebaseJson(mode);
  console.log(`firebase.json を出力完了!`);

  /** staticなファイルのコピー */
  await fileSystem.copy("./static", hostingDistributionPath);
  console.log("static な ファイルのコピーに成功!");

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
  console.log("クライアント向けのスクリプト (main.js) のビルドに成功!");

  buildFunctionsTypeScript();
  console.log("Cloud Functions for Firebase 向けのスクリプトのビルドに成功!");
};

const generateFirebaseJson = (mode: d.Mode): Promise<void> => {
  return fileSystem.outputFile(
    `firebase.json`,
    JSON.stringify({
      functions: {
        source: functionsDistributionPath,
      },
      firestore: {
        rules: firestoreRulesFilePath,
      },
      hosting: {
        public: hostingDistributionPath,
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

const generateFirestoreRules = (): Promise<void> => {
  return fileSystem.outputFile(
    firestoreRulesFilePath,
    `
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`
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
  const devDependencies = packageJsonGen.fromJson(
    await fileSystem.readJSON("package.json")
  ).devDependencies;
  const packageNameUseInFunctions = [
    "firebase-admin",
    "firebase-functions",
    "axios",
    "definy-core",
    "jimp",
    "jsonwebtoken",
    "fs-extra",
    "elm-code-generator",
  ];
  const jsonResult = packageJsonGen.toJson({
    name: "definy-functions",
    version: "1.0.0",
    description: "definy in Cloud Functions for Firebase",
    entryPoint: "functions/main.js",
    author: "narumincho",
    nodeVersion: "14",
    dependencies: new Map(
      [...devDependencies].flatMap(
        ([packageName, packageVersion]): ReadonlyArray<
          readonly [string, string]
        > =>
          packageNameUseInFunctions.includes(packageName)
            ? [[packageName, packageVersion]]
            : []
      )
    ),
    gitHubAccountName: "narumincho",
    gitHubRepositoryName: "Definy",
    homepage: "https://github.com/narumincho/Definy",
  });
  if (jsonResult._ === "Error") {
    throw new Error(jsonResult.error);
  }

  await fileSystem.outputJSON(
    `${functionsDistributionPath}/package.json`,
    jsonResult.ok
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
          d.ExportDefinition.Variable({
            name: identifer.fromString("version"),
            document: "バージョン名",
            expr: d.TsExpr.StringLiteral(
              mode === d.Mode.Develop
                ? "Develop:" + new Date().toISOString()
                : "Release:" + (process.env.GITHUB_REF ?? "???")
            ),
            type: d.TsType.String,
          }),
        ],
        statementList: [],
      },
      d.CodeType.TypeScript
    )
  );
};
