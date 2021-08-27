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
  deleteDirectory,
  directoryPathFrom,
  fileNameFrom,
  fileTypeTypeScript,
} from "../gen/fileSystem/main";
import { packageJson as packageJsonGen } from "../gen/main";

const distributionPath = "./distribution";
const distributionPathAsDirectoryPath = directoryPathFrom(["distribution"]);

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
  await deleteDirectory(distributionPathAsDirectoryPath);
  await mkdirWithLog(distributionPath);
  await copyFile(
    directoryPathFrom([]),
    fileNameFrom("data", fileTypeTypeScript),
    distributionPathAsDirectoryPath,
    fileNameFrom("data", fileTypeTypeScript)
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

  const packageJsonResult = packageJsonGen.toString({
    author: "narumincho",
    dependencies: new Map(),
    description: "HTML, TypeScript, JavaScript, package.json, wasm Generator",
    entryPoint: "./gen/main.js",
    gitHubAccountName: "narumincho",
    gitHubRepositoryName: "Definy",
    homepage: "https://github.com/narumincho/Definy",
    name: "@narumincho/gen",
    nodeVersion: ">=14",
    typeFilePath: "./gen/main.ts",
    version: "1.0.2",
  });

  if (packageJsonResult._ === "Error") {
    throw new Error(packageJsonResult.error);
  }

  await fs.outputFile(`${distributionPath}/package.json`, packageJsonResult.ok);
  console.log("@narumincho/gen の ビルドに成功!");
};

build();
