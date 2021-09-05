import * as fs from "fs-extra";
import {
  ModuleKind,
  ModuleResolutionKind,
  NewLineKind,
  ScriptTarget,
  createProgram,
} from "typescript";
import {
  copyFile,
  directoryPathFrom,
  distributionPathAsDirectoryPath,
  fileNameFrom,
  fileTypeTypeScript,
  resetDistributionDirectory,
} from "../gen/fileSystem/main";
import { packageJson as packageJsonGen } from "../gen/main";

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

const moveWithLog = async (
  source: string,
  distribution: string
): Promise<void> => {
  console.group(`${source} → ${distribution} に移動`);
  await fs.move(source, distribution);
  console.groupEnd();
};

const build = async (): Promise<void> => {
  await resetDistributionDirectory();
  await mkdirWithLog(distributionPath);
  await copyFile(
    {
      directoryPath: directoryPathFrom([]),
      fileName: fileNameFrom("localData", fileTypeTypeScript),
    },
    {
      directoryPath: distributionPathAsDirectoryPath,
      fileName: fileNameFrom("localData", fileTypeTypeScript),
    }
  );

  await mkdirWithLog(`${distributionPath}/gen`);
  await copyWithLog("./gen", `${distributionPath}/gen`);
  await moveWithLog(
    `${distributionPath}/gen/README.md`,
    `${distributionPath}/README.md`
  );
  await moveWithLog(
    `${distributionPath}/gen/LICENCE`,
    `${distributionPath}/LICENCE`
  );

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
    typeFilePath: "./gen/main.ts",
    version: "1.0.4",
  });

  if (packageJsonResult._ === "Error") {
    throw new Error(packageJsonResult.error);
  }

  await fs.outputFile(`${distributionPath}/package.json`, packageJsonResult.ok);
  console.log("@narumincho/gen の ビルドに成功!");
};

build();
