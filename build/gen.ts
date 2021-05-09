import * as fs from "fs-extra";
import * as packageJsonGen from "../gen/packageJson/main";
import * as ts from "typescript";

const distributionPath = "./distribution";

fs.removeSync(distributionPath);
console.log(`${distributionPath}をすべて削除完了!`);

ts.createProgram({
  rootNames: ["./gen/main.ts"],
  options: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    lib: ["ES2020", "DOM"],
    strict: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    newLine: ts.NewLineKind.LineFeed,
    forceConsistentCasingInFileNames: true,
    declaration: true,
    noUncheckedIndexedAccess: true,
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
  typeFilePath: "./gen/main.d.ts",
  version: "1.0.0",
});

if (packageJsonResult._ === "Error") {
  throw new Error(packageJsonResult.error);
}

fs.outputFile(`${distributionPath}/package.json`, packageJsonResult.ok);

fs.outputFile(
  `${distributionPath}/LICENCE`,
  `MIT License

Copyright (c) 2021 narumincho

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
);

fs.copy(`./gen/README.md`, `${distributionPath}/README.md`);
