/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/// @ts-check

const ts = require("typescript");

ts.createProgram({
  rootNames: ["schema/main.ts"],
  options: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    lib: ["ES2020"],
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    newLine: ts.NewLineKind.LineFeed,
    outDir: "schemaJs",
    strict: true,
  },
}).emit();

require("../schemaJs/main.js");
