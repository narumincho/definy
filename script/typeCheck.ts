import { extname, join } from "https://deno.land/std@0.211.0/path/mod.ts";

/**
 * Recursively collects the paths of all TypeScript (.ts) and TypeScript JSX (.tsx) files
 * within a given directory, excluding any paths specified in the ignorePathName set.
 *
 * @param directoryPath - The URL of the directory to search for TypeScript files.
 * @param ignorePathName - A set of paths to ignore during the search.
 * @returns A Promise that resolves to a set of paths to TypeScript files.
 */
export const collectTsOrTsxFilePath = async (
  directoryPath: string,
  ignorePathName: ReadonlySet<string>,
): Promise<ReadonlySet<string>> => {
  const pathSet = new Set<string>();
  for await (const fileOrDirectory of Deno.readDir(directoryPath)) {
    if (fileOrDirectory.isDirectory) {
      const fullPath = join(
        directoryPath,
        fileOrDirectory.name,
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
      const fullPath = join(
        directoryPath,
        fileOrDirectory.name,
      );
      const extension = extname(fileOrDirectory.name);
      if (extension === ".ts" || extension === ".tsx") {
        pathSet.add(fullPath.toString());
      }
    }
  }
  return pathSet;
};

const tsFilePathSet = await collectTsOrTsxFilePath(
  ".",
  new Set(),
);

const process = new Deno.Command(Deno.execPath(), {
  args: ["check", ...tsFilePathSet],
  stderr: "inherit",
  stdout: "inherit",
}).spawn();
Deno.exit((await process.status).code);
