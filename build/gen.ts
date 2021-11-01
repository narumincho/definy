import * as childProcess from "child_process";
import * as fs from "fs-extra";
import {
  ModuleKind,
  ModuleResolutionKind,
  NewLineKind,
  ScriptTarget,
  createProgram,
} from "typescript";
import { packageJson as packageJsonGen } from "../gen/main";
import { resetDistributionDirectory } from "../gen/fileSystem/effect";

/*
 * npm パッケージの @narumincho/gen をビルドするプログラム
 */

/**
 * 出力先フォルダ名
 */
const distributionPath = "./distribution";

const mkdirWithLog = async (path: string): Promise<void> => {
  console.group(`${path} ファイルを作成`);
  await fs.mkdir(path);
  console.groupEnd();
};

const copyWithLog = async (
  source: string,
  distribution: string
): Promise<void> => {
  console.group(`${source} → ${distribution} にコピー`);
  await fs.copy(source, distribution);
  console.groupEnd();
};

const build = async (): Promise<void> => {
  await resetDistributionDirectory();

  await mkdirWithLog(`${distributionPath}/gen`);
  await copyWithLog(`./README.md`, `${distributionPath}/README.md`);

  createProgram({
    rootNames: ["./gen/main.ts"],
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
      outDir: distributionPath,
      declaration: true,
    },
  }).emit();

  const devDependencies = packageJsonGen.fromJson(
    await fs.readJSON("package.json")
  ).devDependencies;
  const packageNameUseInNaruminchoGen: ReadonlyArray<string> = [
    "sha256-uint8array",
  ];
  const packageJsonResult = packageJsonGen.toString({
    author: "narumincho",
    dependencies: new Map(
      [...devDependencies].flatMap(
        ([packageName, packageVersion]): ReadonlyArray<
          readonly [string, string]
        > =>
          packageNameUseInNaruminchoGen.includes(packageName)
            ? [[packageName, packageVersion]]
            : []
      )
    ),
    description: "HTML, TypeScript, JavaScript, package.json, wasm Generator",
    entryPoint: "./gen/main.js",
    gitHubAccountName: "narumincho",
    gitHubRepositoryName: "definy",
    homepage: "https://github.com/narumincho/definy",
    name: "@narumincho/gen",
    nodeVersion: ">=14",
    typeFilePath: "./gen/main.d.ts",
    version: "1.0.5",
  });

  if (packageJsonResult._ === "Error") {
    throw new Error(packageJsonResult.error);
  }

  await fs.outputFile(`${distributionPath}/package.json`, packageJsonResult.ok);

  childProcess.exec(
    `spago build --purs-args "-o ${distributionPath}/output"`,
    {},
    (error, stdout, stderr) => {
      console.log("PureScript build ", { error, stdout, stderr });
      console.log("@narumincho/gen の ビルドに成功!");
    }
  );
};

build();
