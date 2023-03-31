import { extname } from "https://deno.land/std@0.182.0/path/posix.ts";

export const collectTsOrTsxFilePath = async (
  directoryPath: URL,
  ignorePathName: ReadonlySet<string>,
): Promise<ReadonlySet<string>> => {
  const pathSet = new Set<string>();
  for await (const fileOrDirectory of Deno.readDir(directoryPath)) {
    if (fileOrDirectory.isDirectory) {
      const fullPath = new URL(
        fileOrDirectory.name + "/",
        directoryPath,
      );
      for (
        const path of await collectTsOrTsxFilePath(
          fullPath,
          ignorePathName,
        )
      ) {
        if (
          !([...ignorePathName].some((p) => fullPath.toString().includes(p)))
        ) {
          pathSet.add(path);
        }
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
