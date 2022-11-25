import {
  extname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.166.0/path/mod.ts";

const collectTsOrTsxFilePath = async (
  directoryPath: string,
): Promise<ReadonlySet<string>> => {
  const pathSet = new Set<string>();
  for await (const fileOrDirectory of Deno.readDir(directoryPath)) {
    const fullPath = join(directoryPath, fileOrDirectory.name);
    if (fileOrDirectory.isDirectory) {
      for (
        const path of await collectTsOrTsxFilePath(fullPath)
      ) {
        pathSet.add(path);
      }
    } else {
      const extension = extname(fileOrDirectory.name);
      if (extension === ".ts" || extension === ".tsx") {
        pathSet.add(fullPath);
      }
    }
  }
  return pathSet;
};

const rootPath = fromFileUrl(import.meta.resolve("../"));

const tsFilePathSet = await collectTsOrTsxFilePath(rootPath);

const processStatus = await Deno.run({
  cmd: ["deno", "check", ...tsFilePathSet],
}).status();
Deno.exit(processStatus.code);
