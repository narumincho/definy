# js-ts-code-generator

[![npm version](https://badge.fury.io/js/js-ts-code-generator.svg)](https://badge.fury.io/js/js-ts-code-generator)
[![NPM](https://nodei.co/npm/js-ts-code-generator.png)](https://nodei.co/npm/js-ts-code-generator/)

## コンセプト

[Definy](https://github.com/narumincho/Definy) で TypeScript, JavaScript のコードを生成したかったので作った.

- 入力値は, 構造化されているので TypeScript の AST(抽象構文木)とは違う
- 出力した形式は人間にも読みやすい
- Node.js でもブラウザでも動く
- 予約語はあまり気にしなくて良い
- 対応している構文は一部だけ

Node.js, ブラウザ, 両方対応

## sample code サンプルコード

```ts
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
```

### 出力 output

```ts
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
```