import * as childProcess from "child_process";
import * as d from "../localData";
import * as esbuild from "esbuild";
import * as fileSystem from "fs-extra";
import * as pLib from "../output/TypeScriptEntryPoint";
import {
  ModuleKind,
  ModuleResolutionKind,
  NewLineKind,
  ScriptTarget,
  createProgram,
} from "typescript";
import { jsTs } from "../gen/main";

const clientSourceEntryPath = "./client/main.tsx";
const functionsSourceEntryPath = "./functions/main.ts";
const distributionPath = "./distribution/definy";
const functionsDistributionPath = `${distributionPath}/functions`;
const hostingDistributionPath = `${distributionPath}/hosting`;

/**
 * Firebase へ デプロイするためにビルドする
 */
export const build = async (mode: d.Mode, origin: string): Promise<void> => {
  pLib.definyBuild({
    isDevelopment: mode === "Develop",
    origin: origin as pLib.NonEmptyString,
  });
  await buildClientAndFunction(mode, origin);
};

export const buildClientAndFunction = async (mode: d.Mode, origin: string) => {
  await outputNowModeAndOrigin(mode, origin);
  console.log(`out.ts を出力完了!`);

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
    target: ["chrome95", "firefox94", "safari14"],
  });
  console.log("クライアント向けのスクリプト (main.js) のビルドに成功!");

  buildFunctionsTypeScript();
  console.log("Cloud Functions for Firebase 向けのスクリプトのビルドに成功!");
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
