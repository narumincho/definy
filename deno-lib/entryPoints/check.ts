import { collectTsOrTsxFilePath } from "../collectTsOrTsxFilePath.ts";

const rootPath = new URL("../", import.meta.url);

const tsFilePathSet = await collectTsOrTsxFilePath(
  rootPath,
  new Set([
    "/nodeRedPackage",
    "/npm",
  ]),
);

const processStatus = await Deno.run({
  cmd: ["deno", "check", ...tsFilePathSet],
}).status();
Deno.exit(processStatus.code);
