import { collectTsOrTsxFilePath } from "../collectTsOrTsxFilePath.ts";

const rootPath = new URL("../", import.meta.url);

const tsFilePathSet = await collectTsOrTsxFilePath(
  rootPath,
  new Set([
    "/nodeRedPackage",
    "/npm",
  ]),
);

const process = new Deno.Command(Deno.execPath(), {
  args: ["check", ...tsFilePathSet],
  stderr: "inherit",
  stdout: "inherit",
}).spawn();
Deno.exit((await process.status).code);
