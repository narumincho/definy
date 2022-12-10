import { extname } from "https://deno.land/std@0.167.0/path/posix.ts";

const collectTsOrTsxFilePath = async (
  directoryPath: URL,
): Promise<ReadonlySet<string>> => {
  const pathSet = new Set<string>();
  for await (const fileOrDirectory of Deno.readDir(directoryPath)) {
    const fullPath = new URL(
      fileOrDirectory.name,
      directoryPath,
    );
    if (fileOrDirectory.isDirectory) {
      for (
        const path of await collectTsOrTsxFilePath(fullPath)
      ) {
        pathSet.add(path);
      }
    } else {
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
