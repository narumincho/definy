import { extname } from "https://deno.land/std@0.168.0/path/posix.ts";

export const collectTsOrTsxFilePath = async (
  directoryPath: URL,
): Promise<ReadonlySet<string>> => {
  console.log(directoryPath.href);
  const pathSet = new Set<string>();
  for await (const fileOrDirectory of Deno.readDir(directoryPath)) {
    if (fileOrDirectory.isDirectory) {
      if (fileOrDirectory.name === "nodeRedPackage") {
        continue;
      }
      const fullPath = new URL(
        fileOrDirectory.name + "/",
        directoryPath,
      );
      for (
        const path of await collectTsOrTsxFilePath(fullPath)
      ) {
        pathSet.add(path);
      }
    } else {
      const fullPath = new URL(
        fileOrDirectory.name,
        directoryPath,
      );
      const extension = extname(fileOrDirectory.name);
      if (extension === ".ts" || extension === ".tsx") {
        pathSet.add(fullPath.toString());
      }
    }
  }
  return pathSet;
};

const rootPath = new URL(import.meta.resolve("../"));

const tsFilePathSet = await collectTsOrTsxFilePath(rootPath);

const processStatus = await Deno.run({
  cmd: ["deno", "check", ...tsFilePathSet],
}).status();
Deno.exit(processStatus.code);
