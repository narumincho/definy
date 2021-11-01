import * as childProcess from "child_process";
import * as d from "../localData";
import * as esbuild from "esbuild";
import * as fileSystem from "fs-extra";
import {
  ModuleKind,
  ModuleResolutionKind,
  NewLineKind,
  ScriptTarget,
  createProgram,
} from "typescript";
import { jsTs, packageJson as packageJsonGen } from "../gen/main";
import { resetDistributionDirectory } from "../gen/fileSystem/effect";

const clientSourceEntryPath = "./client/main.tsx";
const functionsSourceEntryPath = "./functions/main.ts";
const distributionPath = "./distribution";
const functionsDistributionPath = `${distributionPath}/functions`;
const hostingDistributionPath = `${distributionPath}/hosting`;
const firestoreRulesFilePath = `${distributionPath}/firestore.rules`;
const cloudStorageRulesPath = `${distributionPath}/storage.rules`;

/**
 * Firebase へ デプロイするためにビルドする
 */
export const build = async (mode: d.Mode, origin: string): Promise<void> => {
  await resetDistributionDirectory();
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
  await outputNowModeAndOrigin(mode, origin);
  console.log(`out.ts を出力完了!`);
  await generateFirestoreRules();
  console.log(
    `Firestore 向けセキュリティールール (${firestoreRulesFilePath}) を出力完了!`
  );
  await generateCloudStorageRules();
  console.log(
    `Cloud Storage 向けの セキュリティールール (${cloudStorageRulesPath}) を出力完了!`
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
      storage: {
        rules: cloudStorageRulesPath,
      },
      hosting: {
        public: hostingDistributionPath,
        rewrites: [
          {
            source: "/api/**",
            function: "api",
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
              storage: {
                port: 9199,
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

const generateCloudStorageRules = (): Promise<void> => {
  return fileSystem.outputFile(
    cloudStorageRulesPath,
    `
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
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
  childProcess.exec(
    `npx spago build --purs-args "-o ${functionsDistributionPath}/output"`,
    {},
    (error, stdout, stderr) => {
      console.log("PureScript build ", { error, stdout, stderr });
    }
  );
  createProgram({
    rootNames: [functionsSourceEntryPath],
    options: {
      target: ScriptTarget.ES2020,
      lib: ["ES2020", "DOM"],
      esModuleInterop: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      module: ModuleKind.CommonJS,
      moduleResolution: ModuleResolutionKind.NodeJs,
      isolatedModules: true,
      skipLibCheck: true,
      noUncheckedIndexedAccess: true,
      newLine: NewLineKind.LineFeed,
      declaration: true,
      outDir: functionsDistributionPath,
    },
  }).emit();
};

const outputPackageJsonForFunctions = async (): Promise<void> => {
  const devDependencies = packageJsonGen.fromJson(
    await fileSystem.readJSON("package.json")
  ).devDependencies;
  const packageNameUseInFunctions: ReadonlyArray<string> = [
    "firebase-admin",
    "firebase-functions",
    "axios",
    "jimp",
    "jsonwebtoken",
    "fs-extra",
    "sha256-uint8array",
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
    gitHubRepositoryName: "definy",
    homepage: "https://github.com/narumincho/definy",
  });
  if (jsonResult._ === "Error") {
    throw new Error(jsonResult.error);
  }

  await fileSystem.outputJSON(
    `${functionsDistributionPath}/package.json`,
    jsonResult.ok
  );
};

const outputNowModeAndOrigin = async (
  mode: d.Mode,
  origin: string
): Promise<void> => {
  await fileSystem.outputFile(
    "./out.ts",
    jsTs.generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Variable({
            name: jsTs.identifierFromString("nowMode"),
            document: "実行モード (ビルド時にコード生成される)",
            expr: d.TsExpr.Get({
              expr: d.TsExpr.ImportedVariable({
                moduleName: "./localData",
                name: jsTs.identifierFromString("Mode"),
              }),
              propertyExpr: d.TsExpr.StringLiteral(mode),
            }),
            type: d.TsType.ImportedType({
              moduleName: "./localData",
              name: jsTs.identifierFromString("Mode"),
            }),
          }),
          d.ExportDefinition.Variable({
            name: jsTs.identifierFromString("origin"),
            document: "オリジン (ビルド時にコード生成される)",
            expr: d.TsExpr.StringLiteral(origin),
            type: d.TsType.String,
          }),
          d.ExportDefinition.Variable({
            name: jsTs.identifierFromString("version"),
            document: "バージョン名",
            expr: d.TsExpr.StringLiteral(
              mode === d.Mode.Develop
                ? "Develop: " + new Date().toISOString()
                : "Release: " + (process.env.GITHUB_SHA ?? "???")
            ),
            type: d.TsType.String,
          }),
          d.ExportDefinition.Variable({
            name: jsTs.identifierFromString("commitUrl"),
            document: "このサーバーのコードのスナップショット",
            expr: d.TsExpr.StringLiteral(
              "https://github.com/narumincho/definy" +
                (process.env.GITHUB_SHA === undefined
                  ? ""
                  : "/tree/" + process.env.GITHUB_SHA)
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
