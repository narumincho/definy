import * as fs from "fs-extra";
import * as packageJsonGen from "../gen/packageJson/main";
import * as ts from "typescript";

const distFolder = "./distribution";

fs.removeSync(distFolder);

ts.createProgram({
  rootNames: ["./gen/jsTs/main.ts"],
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
    outDir: distFolder,
  },
}).emit();

const packageJsonResult = packageJsonGen.toString({
  author: "narumincho",
  dependencies: new Map(),
  description: "TypeScript And JavaScript Code Generator",
  entryPoint: "./gen/jsTs/main.js",
  gitHubAccountName: "narumincho",
  gitHubRepositoryName: "Definy",
  homepage: "https://github.com/narumincho/Definy",
  name: "js-ts-code-generator",
  nodeVersion: "14",
  typeFilePath: "./gen/jsTs/main.d.ts",
  version: "0.4.1",
});

if (packageJsonResult._ === "Error") {
  throw new Error(packageJsonResult.error);
}

fs.outputFile(`${distFolder}/package.json`, packageJsonResult.ok);

fs.outputFile(
  `${distFolder}/LICENCE`,
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

fs.outputFile(
  `${distFolder}/README.md`,
  `# js-ts-code-generator

[![npm version](https://badge.fury.io/js/js-ts-code-generator.svg)](https://badge.fury.io/js/js-ts-code-generator)

## コンセプト

[Definy](https://github.com/narumincho/Definy) で TypeScript, JavaScript のコードを生成したかったので作った.

- 入力値は, 構造化されているので TypeScript の AST(抽象構文木)とは違う
- 出力した形式は人間にも読みやすい
- Node.js でもブラウザでも動く
- 予約語はあまり気にしなくて良い
- 対応している構文は一部だけ
- var などの古い構文を出力せず, 新しいスタイルのコードを生成する

Node.js, ブラウザ, 両方対応

## sample code サンプルコード

\`\`\`ts
import * as identifer from "js-ts-code-generator/source/identifer";
import * as util from "js-ts-code-generator/source/util";
import {
  BinaryOperator,
  Code,
  ExportDefinition,
  Expr,
  Maybe,
  Member,
  Statement,
  Type,
} from "js-ts-code-generator/source/data";
import * as generator from "js-ts-code-generator";

const serverCode: JsTsCode = JsTsCode.helper({
  exportDefinitionList: [
    ExportDefinition.Function({
      name: identifer.fromString("middleware"),
      document: "ミドルウェア",
      typeParameterList: [],
      parameterList: [
        {
          name: identifer.fromString("request"),
          document: "リクエスト",
          type: Type.ImportedType({
            moduleName: "express",
            name: identifer.fromString("Request"),
          }),
        },
        {
          name: identifer.fromString("response"),
          document: "レスポンス",
          type: Type.ImportedType({
            moduleName: "express",
            name: identifer.fromString("Response"),
          }),
        },
      ],
      returnType: Type.Void,
      statementList: [
        Statement.VariableDefinition({
          isConst: true,
          name: identifer.fromString("accept"),
          type: Type.Union([Type.String, Type.Undefined]),
          expr: util.get(
            util.get(Expr.Variable(identifer.fromString("request")), "headers"),
            "accept"
          ),
        }),
        Statement.If({
          condition: util.logicalAnd(
            util.notEqual(
              Expr.Variable(identifer.fromString("accept")),
              Expr.UndefinedLiteral
            ),
            util.callMethod(
              Expr.Variable(identifer.fromString("accept")),
              "includes",
              [Expr.StringLiteral("text/html")]
            )
          ),
          thenStatementList: [
            Statement.EvaluateExpr(
              util.callMethod(
                Expr.Variable(identifer.fromString("response")),
                "setHeader",
                [
                  Expr.StringLiteral("content-type"),
                  Expr.StringLiteral("text/html"),
                ]
              )
            ),
          ],
        }),
      ],
    }),
  ],
  statementList: [],
});
const codeAsString = generator.generateCodeAsString(serverCode, "TypeScript");
console.log(codeAsString);
\`\`\`

### 出力 output

\`\`\`ts
/* eslint-disable */
/* generated by js-ts-code-generator. Do not edit! */

import * as a from "express";

/**
 * ミドルウェア
 * @param request リクエスト
 * @param response レスポンス
 */
export const middleware = (request: a.Request, response: a.Response): void => {
  const accept: string | undefined = request.headers.accept;
  if (accept !== undefined && accept.includes("text/html")) {
    response.setHeader("content-type", "text/html");
  }
};
\`\`\`

`
);
