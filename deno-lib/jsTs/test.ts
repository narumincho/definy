import {
  assert,
  assertEquals,
  assertMatch,
  assertNotMatch,
} from "https://deno.land/std@0.170.0/testing/asserts.ts";
import * as jsTs from "./main.ts";

const expressRequest: jsTs.data.TsType = {
  _: "ImportedType",
  importedType: {
    moduleName: "express",
    nameAndArguments: {
      name: jsTs.identifierFromString("Request"),
      arguments: [],
    },
  },
};
const expressResponse: jsTs.data.TsType = {
  _: "ImportedType",
  importedType: {
    moduleName: "express",
    nameAndArguments: {
      name: jsTs.identifierFromString("Response"),
      arguments: [],
    },
  },
};

const sampleCode: jsTs.data.JsTsCode = {
  exportDefinitionList: [
    jsTs.exportDefinitionFunction({
      name: jsTs.identifierFromString("middleware"),
      typeParameterList: [],
      parameterList: [
        {
          name: jsTs.identifierFromString("request"),
          document: "expressのリクエスト",
          type: expressRequest,
        },
        {
          name: jsTs.identifierFromString("response"),
          document: "expressのレスポンス",
          type: expressResponse,
        },
      ],
      document: "ミドルウェア",
      returnType: { _: "Void" },
      statementList: [],
    }),
  ],
  statementList: [],
};
const nodeJsTypeScriptCode = jsTs.generateCodeAsString(
  sampleCode,
  "TypeScript",
);
console.log(nodeJsTypeScriptCode);
Deno.test("return string", () => {
  assertEquals(typeof nodeJsTypeScriptCode, "string");
});

Deno.test("include import keyword", () => {
  assertMatch(nodeJsTypeScriptCode, /import/u);
});

Deno.test("include import path", () => {
  assertMatch(nodeJsTypeScriptCode, /express/u);
});

Deno.test("not include revered word", () => {
  const codeAsString = jsTs.generateCodeAsString(
    {
      exportDefinitionList: [
        jsTs.exportDefinitionFunction({
          name: jsTs.identifierFromString("new"),
          document: "newという名前の関数",
          typeParameterList: [],
          parameterList: [],
          returnType: { _: "Void" },
          statementList: [],
        }),
      ],
      statementList: [],
    },
    "TypeScript",
  );

  console.log("new code", codeAsString);
  assertNotMatch(codeAsString, /const new =/u);
});

Deno.test("識別子として使えない文字は, 変更される", () => {
  const codeAsString = jsTs.generateCodeAsString(
    {
      exportDefinitionList: [
        jsTs.exportDefinitionFunction({
          name: jsTs.identifierFromString("0name"),
          document: "0から始まる識別子",
          typeParameterList: [],
          parameterList: [],
          returnType: { _: "Void" },
          statementList: [],
        }),
      ],
      statementList: [],
    },
    "TypeScript",
  );
  console.log(codeAsString);
  assertNotMatch(codeAsString, /const 0name/u);
});
Deno.test("識別子の生成で識別子に使えない文字が含まれているかどうか", () => {
  const reserved: ReadonlySet<string> = new Set();
  let index = jsTs.initialIdentifierIndex;
  for (let i = 0; i < 999; i += 1) {
    const createIdentifierResult = jsTs.createIdentifier(index, reserved);
    index = createIdentifierResult.nextIdentifierIndex;
    if (!jsTs.isIdentifier(createIdentifierResult.identifier)) {
      throw new Error(
        "create not identifier. identifier=" +
          createIdentifierResult.identifier,
      );
    }
  }
});
Deno.test("escape string literal", () => {
  const nodeJsCode: jsTs.data.JsTsCode = {
    exportDefinitionList: [
      {
        type: "variable",
        variable: {
          name: jsTs.identifierFromString("stringValue"),
          document: "文字列リテラルでエスケープしているか調べる",
          type: { _: "String" },
          expr: jsTs.stringLiteral(`

          改行
          "ダブルクオーテーション"
  `),
        },
      },
    ],
    statementList: [],
  };
  const codeAsString = jsTs.generateCodeAsString(nodeJsCode, "TypeScript");
  console.log(codeAsString);
  assertMatch(codeAsString, /\\"/u);
  assertMatch(codeAsString, /\\n/u);
});

Deno.test("include function parameter name", () => {
  const nodeJsCode: jsTs.data.JsTsCode = {
    exportDefinitionList: [
      jsTs.exportDefinitionFunction({
        name: jsTs.identifierFromString("middleware"),
        document: "ミドルウェア",
        typeParameterList: [],
        parameterList: [
          {
            name: jsTs.identifierFromString("request"),
            document: "リクエスト",
            type: {
              _: "ImportedType",
              importedType: {
                moduleName: "express",
                nameAndArguments: {
                  name: jsTs.identifierFromString("Request"),
                  arguments: [],
                },
              },
            },
          },
          {
            name: jsTs.identifierFromString("response"),
            document: "レスポンス",
            type: {
              _: "ImportedType",
              importedType: {
                moduleName: "express",
                nameAndArguments: {
                  name: jsTs.identifierFromString("Response"),
                  arguments: [],
                },
              },
            },
          },
        ],
        returnType: { _: "Void" },
        statementList: [
          {
            _: "VariableDefinition",
            variableDefinitionStatement: {
              name: jsTs.identifierFromString("accept"),
              type: jsTs.typeUnion([{ _: "String" }, { _: "Undefined" }]),
              isConst: true,
              expr: jsTs.get(
                jsTs.get(
                  jsTs.variable(jsTs.identifierFromString("request")),
                  "headers",
                ),
                "accept",
              ),
            },
          },
          {
            _: "If",
            ifStatement: {
              condition: jsTs.logicalAnd(
                jsTs.notEqual(
                  jsTs.variable(jsTs.identifierFromString("accept")),
                  { _: "UndefinedLiteral" },
                ),
                jsTs.callMethod(
                  jsTs.variable(jsTs.identifierFromString("accept")),
                  "includes",
                  [jsTs.stringLiteral("text/html")],
                ),
              ),
              thenStatementList: [
                jsTs.statementEvaluateExpr(
                  jsTs.callMethod(
                    jsTs.variable(jsTs.identifierFromString("response")),
                    "setHeader",
                    [
                      jsTs.stringLiteral("content-type"),
                      jsTs.stringLiteral("text/html"),
                    ],
                  ),
                ),
              ],
            },
          },
        ],
      }),
    ],
    statementList: [],
  };
  const code = jsTs.generateCodeAsString(nodeJsCode, "TypeScript");
  console.log(code);
  assertMatch(code, /request/u);
});
Deno.test("get array index", () => {
  const code = jsTs.generateCodeAsString(
    {
      exportDefinitionList: [
        jsTs.exportDefinitionFunction({
          name: jsTs.identifierFromString("getZeroIndexElement"),
          document: "Uint8Arrayの0番目の要素を取得する",
          typeParameterList: [],
          parameterList: [
            {
              name: jsTs.identifierFromString("array"),
              document: "Uint8Array",
              type: jsTs.uint8ArrayType,
            },
          ],
          returnType: { _: "Number" },
          statementList: [
            jsTs.statementReturn({
              _: "Get",
              getExpr: {
                expr: jsTs.variable(jsTs.identifierFromString("array")),
                propertyExpr: jsTs.numberLiteral(0),
              },
            }),
          ],
        }),
      ],
      statementList: [],
    },
    "TypeScript",
  );
  console.log(code);
  assertMatch(code, /\[0\]/u);
});
const scopedCode = jsTs.generateCodeAsString(
  {
    exportDefinitionList: [],
    statementList: [
      {
        _: "VariableDefinition",
        variableDefinitionStatement: {
          name: jsTs.identifierFromString("sorena"),
          isConst: false,
          type: { _: "String" },
          expr: jsTs.stringLiteral("それな"),
        },
      },
      jsTs.consoleLog(jsTs.variable(jsTs.identifierFromString("sorena"))),
    ],
  },
  "JavaScript",
);

Deno.test("statementList in { } scope curly braces", () => {
  console.log(scopedCode);
  assertMatch(scopedCode, /\{[^{]*"それな[^}]*\}/u);
});
Deno.test("ESModules Browser Code not include type ", () => {
  assertNotMatch(scopedCode, /string/);
});
Deno.test("type parameter", () => {
  const code = jsTs.generateCodeAsString(
    {
      exportDefinitionList: [
        jsTs.exportDefinitionFunction({
          name: jsTs.identifierFromString("sample"),
          document: "",
          typeParameterList: [],
          parameterList: [],
          returnType: jsTs.promiseType({ _: "String" }),
          statementList: [],
        }),
      ],
      statementList: [],
    },
    "TypeScript",
  );
  console.log(code);
  assertMatch(code, /Promise<string>/u);
});
Deno.test("object literal key is escaped", () => {
  const code = jsTs.generateCodeAsString(
    {
      exportDefinitionList: [],
      statementList: [
        jsTs.statementEvaluateExpr(
          jsTs.objectLiteral([
            jsTs.memberKeyValue("abc", jsTs.numberLiteral(3)),
            jsTs.memberKeyValue("a b c", jsTs.stringLiteral("separated")),
          ]),
        ),
      ],
    },
    "TypeScript",
  );
  console.log(code);
  assertMatch(code, /"a b c"/u);
});
Deno.test("binary operator combine", () => {
  const code = jsTs.generateCodeAsString(
    {
      exportDefinitionList: [],
      statementList: [
        jsTs.statementEvaluateExpr(
          jsTs.equal(
            jsTs.equal(
              jsTs.addition(
                jsTs.multiplication(
                  jsTs.numberLiteral(3),
                  jsTs.numberLiteral(9),
                ),
                jsTs.multiplication(
                  jsTs.numberLiteral(7),
                  jsTs.numberLiteral(6),
                ),
              ),
              jsTs.addition(
                jsTs.addition(jsTs.numberLiteral(2), jsTs.numberLiteral(3)),
                jsTs.addition(jsTs.numberLiteral(5), jsTs.numberLiteral(8)),
              ),
            ),
            jsTs.multiplication(
              jsTs.numberLiteral(5),
              jsTs.addition(jsTs.numberLiteral(7), jsTs.numberLiteral(8)),
            ),
          ),
        ),
      ],
    },
    "JavaScript",
  );
  console.log(code);
  assert(
    code.includes("3 * 9 + 7 * 6 === 2 + 3 + (5 + 8) === 5 * (7 + 8)"),
  );
});
Deno.test("object literal return need parenthesis", () => {
  const code = jsTs.generateCodeAsString(
    {
      exportDefinitionList: [
        jsTs.exportDefinitionFunction({
          name: jsTs.identifierFromString("returnObject"),
          document: "",
          typeParameterList: [],
          parameterList: [],
          returnType: jsTs.typeObject([
            {
              name: { type: "string", value: "name" },
              required: true,
              type: { _: "String" },
              document: "",
            },
            {
              name: { type: "string", value: "age" },
              required: true,
              type: { _: "Number" },
              document: "",
            },
          ]),
          statementList: [
            jsTs.statementReturn(
              jsTs.objectLiteral([
                jsTs.memberKeyValue("name", jsTs.stringLiteral("mac")),
                jsTs.memberKeyValue("age", jsTs.numberLiteral(10)),
              ]),
            ),
          ],
        }),
      ],
      statementList: [],
    },
    "TypeScript",
  );
  console.log(code);
  assertMatch(code, /\(\{.*\}\)/u);
});
Deno.test("let variable", () => {
  const v = jsTs.identifierFromString("v");
  const code = jsTs.generateCodeAsString(
    {
      exportDefinitionList: [],
      statementList: [
        {
          _: "VariableDefinition",
          variableDefinitionStatement: {
            name: v,
            type: { _: "Number" },
            expr: jsTs.numberLiteral(10),
            isConst: false,
          },
        },
        {
          _: "Set",
          setStatement: {
            target: jsTs.variable(v),
            operatorMaybe: undefined,
            expr: jsTs.numberLiteral(30),
          },
        },
        {
          _: "Set",
          setStatement: {
            target: jsTs.variable(v),
            operatorMaybe: "Addition",
            expr: jsTs.numberLiteral(1),
          },
        },
      ],
    },
    "TypeScript",
  );
  console.log(code);
  assertMatch(code, /let v: number = 10;[\n ]*v = 30;[\n ]*v \+= 1;/u);
});
Deno.test("for of", () => {
  const code: jsTs.data.JsTsCode = {
    exportDefinitionList: [],
    statementList: [
      {
        _: "ForOf",
        forOfStatement: {
          elementVariableName: jsTs.identifierFromString("element"),
          iterableExpr: {
            _: "ArrayLiteral",
            arrayItemList: [
              { expr: jsTs.numberLiteral(1), spread: false },
              { expr: jsTs.numberLiteral(2), spread: false },
              {
                expr: {
                  _: "ArrayLiteral",
                  arrayItemList: [
                    { expr: jsTs.numberLiteral(3), spread: false },
                    { expr: jsTs.numberLiteral(4), spread: false },
                    { expr: jsTs.numberLiteral(5), spread: false },
                  ],
                },
                spread: true,
              },
            ],
          },
          statementList: [
            jsTs.consoleLog(
              jsTs.variable(jsTs.identifierFromString("element")),
            ),
          ],
        },
      },
    ],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  assertMatch(codeAsString, /for .* of \[1, 2, \.\.\.\[3, 4, 5\] *\]/u);
});
Deno.test("switch", () => {
  const code: jsTs.data.JsTsCode = {
    exportDefinitionList: [
      {
        type: "typeAlias",
        typeAlias: {
          name: jsTs.identifierFromString("Result"),
          document: "Result型",
          namespace: [],
          typeParameterList: [
            jsTs.identifierFromString("error"),
            jsTs.identifierFromString("ok"),
          ],
          type: jsTs.typeUnion([
            jsTs.typeObject([
              {
                name: { type: "string", value: "_" },
                required: true,
                type: { _: "StringLiteral", string: "Ok" },
                document: "",
              },
              {
                name: { type: "string", value: "ok" },
                required: true,
                type: jsTs.typeScopeInFileNoArguments(
                  jsTs.identifierFromString("ok"),
                ),
                document: "",
              },
            ]),
            jsTs.typeObject([
              {
                name: { type: "string", value: "_" },
                required: true,
                type: { _: "StringLiteral", string: "Error" },
                document: "Error",
              },
              {
                name: { type: "string", value: "error" },
                required: true,
                type: jsTs.typeScopeInFileNoArguments(
                  jsTs.identifierFromString("error"),
                ),
                document: "",
              },
            ]),
          ]),
        },
      },
      jsTs.exportDefinitionFunction({
        name: jsTs.identifierFromString("switchSample"),
        document: "switch文のテスト",
        typeParameterList: [
          jsTs.identifierFromString("ok"),
          jsTs.identifierFromString("error"),
        ],
        parameterList: [
          {
            name: jsTs.identifierFromString("value"),
            document: "",
            type: {
              _: "ScopeInGlobal",
              typeNameAndTypeParameter: {
                name: jsTs.identifierFromString("Result"),
                arguments: [
                  jsTs.typeScopeInFileNoArguments(
                    jsTs.identifierFromString("ok"),
                  ),
                  jsTs.typeScopeInFileNoArguments(
                    jsTs.identifierFromString("error"),
                  ),
                ],
              },
            },
          },
        ],
        returnType: { _: "String" },
        statementList: [
          {
            _: "Switch",
            switchStatement: {
              expr: jsTs.get(
                jsTs.variable(jsTs.identifierFromString("value")),
                "_",
              ),
              patternList: [
                {
                  caseString: "Ok",
                  statementList: [
                    jsTs.statementReturn(
                      jsTs.callMethod(
                        jsTs.get(
                          jsTs.variable(jsTs.identifierFromString("value")),
                          "ok",
                        ),
                        "toString",
                        [],
                      ),
                    ),
                  ],
                },
                {
                  caseString: "Error",
                  statementList: [
                    jsTs.statementReturn(
                      jsTs.callMethod(
                        jsTs.get(
                          jsTs.variable(jsTs.identifierFromString("value")),
                          "error",
                        ),
                        "toString",
                        [],
                      ),
                    ),
                  ],
                },
              ],
            },
          },
        ],
      }),
    ],
    statementList: [],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  assertMatch(codeAsString, /switch \(.+\) \{\n +case .+:/u);
});
Deno.test("Type Assertion", () => {
  const code: jsTs.data.JsTsCode = {
    exportDefinitionList: [],
    statementList: [
      jsTs.statementEvaluateExpr({
        _: "TypeAssertion",
        typeAssertion: {
          expr: jsTs.objectLiteral([]),
          type: jsTs.dateType,
        },
      }),
    ],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  assertMatch(codeAsString, /as globalThis.Date/u);
});
Deno.test("Type Intersection", () => {
  const code: jsTs.data.JsTsCode = {
    exportDefinitionList: [
      {
        type: "typeAlias",
        typeAlias: {
          name: jsTs.identifierFromString("SampleIntersectionType"),
          document: "",
          namespace: [],
          typeParameterList: [],
          type: {
            _: "Intersection",
            intersectionType: {
              left: jsTs.dateType,
              right: jsTs.uint8ArrayType,
            },
          },
        },
      },
    ],
    statementList: [],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  assertMatch(codeAsString, /globalThis.Date & globalThis.Uint8Array/u);
});

Deno.test("object literal spread syntax", () => {
  const code: jsTs.data.JsTsCode = {
    exportDefinitionList: [],
    statementList: [
      {
        _: "VariableDefinition",
        variableDefinitionStatement: {
          name: jsTs.identifierFromString("value"),
          isConst: true,
          type: jsTs.typeObject([
            {
              name: { type: "string", value: "a" },
              required: true,
              type: { _: "String" },
              document: "",
            },
            {
              name: { type: "string", value: "b" },
              required: true,
              type: { _: "Number" },
              document: "",
            },
          ]),
          expr: jsTs.objectLiteral([
            jsTs.memberKeyValue("a", jsTs.stringLiteral("aValue")),
            jsTs.memberKeyValue("b", jsTs.numberLiteral(123)),
          ]),
        },
      },
      jsTs.consoleLog(
        jsTs.objectLiteral([
          {
            _: "Spread",
            tsExpr: jsTs.variable(jsTs.identifierFromString("value")),
          },
          jsTs.memberKeyValue("b", jsTs.numberLiteral(987)),
        ]),
      ),
    ],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  assertMatch(codeAsString, /\{ *\.\.\.value *, *b: 987 \}/u);
});

Deno.test("type property document", () => {
  const code: jsTs.data.JsTsCode = {
    exportDefinitionList: [
      {
        type: "typeAlias",
        typeAlias: {
          name: jsTs.identifierFromString("Time"),
          document: "初期のdefinyで使う時間の内部表現",
          namespace: [],
          typeParameterList: [],
          type: jsTs.typeObject([
            {
              name: { type: "string", value: "day" },
              required: true,
              type: { _: "Number" },
              document: "1970-01-01からの経過日数. マイナスになることもある",
            },
            {
              name: { type: "string", value: "millisecond" },
              required: true,
              type: { _: "Number" },
              document: "日にちの中のミリ秒. 0 to 86399999 (=1000*60*60*24-1)",
            },
          ]),
        },
      },
    ],
    statementList: [],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  assertMatch(codeAsString, /日にちの中のミリ秒. 0 to 86399999/u);
});

Deno.test("output lambda type parameter", () => {
  const typeParameterIdentifier = jsTs.identifierFromString("t");
  const code: jsTs.data.JsTsCode = {
    exportDefinitionList: [],
    statementList: [
      {
        _: "VariableDefinition",
        variableDefinitionStatement: {
          name: jsTs.identifierFromString("sampleFunction"),
          isConst: true,
          type: {
            _: "Function",
            functionType: {
              typeParameterList: [typeParameterIdentifier],
              parameterList: [
                jsTs.typeScopeInFileNoArguments(typeParameterIdentifier),
              ],
              return: jsTs.typeObject([
                {
                  name: { type: "string", value: "value" },
                  required: true,
                  document: "",
                  type: jsTs.typeScopeInFileNoArguments(
                    typeParameterIdentifier,
                  ),
                },
                {
                  name: { type: "string", value: "s" },
                  required: true,
                  document: "",
                  type: {
                    _: "ImportedType",
                    importedType: {
                      moduleName: "sampleModule",
                      nameAndArguments: {
                        name: jsTs.identifierFromString("Type"),
                        arguments: [{ _: "Number" }],
                      },
                    },
                  },
                },
              ]),
            },
          },
          expr: {
            _: "Lambda",
            lambdaExpr: {
              parameterList: [
                {
                  name: jsTs.identifierFromString("input"),
                  type: jsTs.typeScopeInFileNoArguments(
                    typeParameterIdentifier,
                  ),
                },
              ],
              typeParameterList: [typeParameterIdentifier],
              returnType: jsTs.typeObject([
                {
                  name: { type: "string", value: "value" },
                  required: true,
                  document: "",
                  type: jsTs.typeScopeInFileNoArguments(
                    typeParameterIdentifier,
                  ),
                },
              ]),
              statementList: [
                jsTs.statementReturn(
                  jsTs.objectLiteral([
                    jsTs.memberKeyValue(
                      "value",
                      jsTs.variable(jsTs.identifierFromString("input")),
                    ),
                  ]),
                ),
              ],
            },
          },
        },
      },
    ],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  assertMatch(
    codeAsString,
    /<t extends unknown>\(input: t\): \{ readonly value: t \} =>/u,
  );
});

Deno.test("output optional type member", () => {
  const code: jsTs.data.JsTsCode = {
    exportDefinitionList: [
      {
        type: "variable",
        variable: {
          name: jsTs.identifierFromString("value"),
          document: "年齢があってもなくてもいいやつ",
          type: jsTs.typeObject([
            {
              name: { type: "string", value: "name" },
              required: true,
              document: "名前",
              type: { _: "String" },
            },
            {
              name: { type: "string", value: "age" },
              required: false,
              document: "年齢",
              type: { _: "Number" },
            },
          ]),
          expr: jsTs.objectLiteral([
            jsTs.memberKeyValue("name", jsTs.stringLiteral("narumincho")),
          ]),
        },
      },
    ],
    statementList: [],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  assertMatch(codeAsString, /readonly age\?: number/u);
});

Deno.test("read me code", () => {
  const serverCode: jsTs.data.JsTsCode = {
    exportDefinitionList: [
      jsTs.exportDefinitionFunction({
        name: jsTs.identifierFromString("middleware"),
        document: "ミドルウェア",
        typeParameterList: [],
        parameterList: [
          {
            name: jsTs.identifierFromString("request"),
            document: "リクエスト",
            type: {
              _: "ImportedType",
              importedType: {
                moduleName: "express",
                nameAndArguments: {
                  name: jsTs.identifierFromString("Request"),
                  arguments: [],
                },
              },
            },
          },
          {
            name: jsTs.identifierFromString("response"),
            document: "レスポンス",
            type: {
              _: "ImportedType",
              importedType: {
                moduleName: "express",
                nameAndArguments: {
                  name: jsTs.identifierFromString("Response"),
                  arguments: [],
                },
              },
            },
          },
        ],
        returnType: { _: "Void" },
        statementList: [
          {
            _: "VariableDefinition",
            variableDefinitionStatement: {
              isConst: true,
              name: jsTs.identifierFromString("accept"),
              type: jsTs.typeUnion([{ _: "String" }, { _: "Undefined" }]),
              expr: jsTs.get(
                jsTs.get(
                  jsTs.variable(jsTs.identifierFromString("request")),
                  "headers",
                ),
                "accept",
              ),
            },
          },
          {
            _: "If",
            ifStatement: {
              condition: jsTs.logicalAnd(
                jsTs.notEqual(
                  jsTs.variable(jsTs.identifierFromString("accept")),
                  { _: "UndefinedLiteral" },
                ),
                jsTs.callMethod(
                  jsTs.variable(jsTs.identifierFromString("accept")),
                  "includes",
                  [jsTs.stringLiteral("text/html")],
                ),
              ),
              thenStatementList: [
                jsTs.statementEvaluateExpr(
                  jsTs.callMethod(
                    jsTs.variable(jsTs.identifierFromString("response")),
                    "setHeader",
                    [
                      jsTs.stringLiteral("content-type"),
                      jsTs.stringLiteral("text/html"),
                    ],
                  ),
                ),
              ],
            },
          },
        ],
      }),
    ],
    statementList: [],
  };
  assertEquals(
    jsTs.generateCodeAsString(serverCode, "TypeScript"),
    `/* eslint-disable */
/* generated by definy. Do not edit! */

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


`,
  );
});
