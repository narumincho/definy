import { d, jsTs } from "../gen/main";

describe("test", () => {
  const expressRequest = d.TsType.ImportedType({
    moduleName: "express",
    name: jsTs.identiferFromString("Request"),
  });
  const expressResponse = d.TsType.ImportedType({
    moduleName: "express",
    name: jsTs.identiferFromString("Response"),
  });

  const sampleCode: d.JsTsCode = {
    exportDefinitionList: [
      d.ExportDefinition.Function({
        name: jsTs.identiferFromString("middleware"),
        typeParameterList: [],
        parameterList: [
          {
            name: jsTs.identiferFromString("request"),
            document: "expressのリクエスト",
            type: expressRequest,
          },
          {
            name: jsTs.identiferFromString("response"),
            document: "expressのレスポンス",
            type: expressResponse,
          },
        ],
        document: "ミドルウェア",
        returnType: d.TsType.Void,
        statementList: [],
      }),
    ],
    statementList: [],
  };
  const nodeJsTypeScriptCode = jsTs.generateCodeAsString(
    sampleCode,
    "TypeScript"
  );
  console.log(nodeJsTypeScriptCode);
  it("return string", () => {
    expect(typeof nodeJsTypeScriptCode).toBe("string");
  });
  it("include import keyword", () => {
    expect(nodeJsTypeScriptCode).toMatch("import");
  });
  it("include import path", () => {
    expect(nodeJsTypeScriptCode).toMatch("express");
  });
  it("not include revered word", () => {
    const codeAsString = jsTs.generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: jsTs.identiferFromString("new"),
            document: "newという名前の関数",
            typeParameterList: [],
            parameterList: [],
            returnType: d.TsType.Void,
            statementList: [],
          }),
        ],
        statementList: [],
      },
      "TypeScript"
    );

    console.log("new code", codeAsString);
    expect(codeAsString).not.toMatch(/const new =/u);
  });
  it("識別子として使えない文字は, 変更される", () => {
    const codeAsString = jsTs.generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: jsTs.identiferFromString("0name"),
            document: "0から始まる識別子",
            typeParameterList: [],
            parameterList: [],
            returnType: d.TsType.Void,
            statementList: [],
          }),
        ],
        statementList: [],
      },
      "TypeScript"
    );
    console.log(codeAsString);
    expect(codeAsString).not.toMatch(/const 0name/u);
  });
  it("識別子の生成で識別子に使えない文字が含まれているかどうか", () => {
    expect(() => {
      const reserved: ReadonlySet<string> = new Set();
      let index = jsTs.initialIdentiferIndex;
      for (let i = 0; i < 999; i += 1) {
        const createIdentiferResult = jsTs.createIdentifer(index, reserved);
        index = createIdentiferResult.nextIdentiferIndex;
        if (!jsTs.isIdentifer(createIdentiferResult.identifer.string)) {
          throw new Error(
            "create not identifer. identifer=" +
              createIdentiferResult.identifer.string
          );
        }
      }
    }).not.toThrow();
  });
  it("escape string literal", () => {
    const nodeJsCode: d.JsTsCode = {
      exportDefinitionList: [
        d.ExportDefinition.Variable({
          name: jsTs.identiferFromString("stringValue"),
          document: "文字列リテラルでエスケープしているか調べる",
          type: d.TsType.String,
          expr: d.TsExpr.StringLiteral(`

          改行
          "ダブルクオーテーション"
  `),
        }),
      ],
      statementList: [],
    };
    const codeAsString = jsTs.generateCodeAsString(nodeJsCode, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/\\"/u);
    expect(codeAsString).toMatch(/\\n/u);
  });

  it("include function parameter name", () => {
    const nodeJsCode: d.JsTsCode = {
      exportDefinitionList: [
        d.ExportDefinition.Function({
          name: jsTs.identiferFromString("middleware"),
          document: "ミドルウェア",
          typeParameterList: [],
          parameterList: [
            {
              name: jsTs.identiferFromString("request"),
              document: "リクエスト",
              type: d.TsType.ImportedType({
                moduleName: "express",
                name: jsTs.identiferFromString("Request"),
              }),
            },
            {
              name: jsTs.identiferFromString("response"),
              document: "レスポンス",
              type: d.TsType.ImportedType({
                moduleName: "express",
                name: jsTs.identiferFromString("Response"),
              }),
            },
          ],
          returnType: d.TsType.Void,
          statementList: [
            d.Statement.VariableDefinition({
              name: jsTs.identiferFromString("accept"),
              type: d.TsType.Union([d.TsType.String, d.TsType.Undefined]),
              isConst: true,
              expr: jsTs.get(
                jsTs.get(
                  d.TsExpr.Variable(jsTs.identiferFromString("request")),
                  "headers"
                ),
                "accept"
              ),
            }),
            d.Statement.If({
              condition: d.TsExpr.BinaryOperator({
                left: d.TsExpr.BinaryOperator({
                  left: d.TsExpr.Variable(jsTs.identiferFromString("accept")),
                  operator: "NotEqual",
                  right: d.TsExpr.UndefinedLiteral,
                }),
                operator: "LogicalAnd",
                right: jsTs.callMethod(
                  d.TsExpr.Variable(jsTs.identiferFromString("accept")),
                  "includes",
                  [d.TsExpr.StringLiteral("text/html")]
                ),
              }),
              thenStatementList: [
                d.Statement.EvaluateExpr(
                  jsTs.callMethod(
                    d.TsExpr.Variable(jsTs.identiferFromString("response")),
                    "setHeader",
                    [
                      d.TsExpr.StringLiteral("content-type"),
                      d.TsExpr.StringLiteral("text/html"),
                    ]
                  )
                ),
              ],
            }),
          ],
        }),
      ],
      statementList: [],
    };
    const code = jsTs.generateCodeAsString(nodeJsCode, "TypeScript");
    console.log(code);
    expect(code).toMatch("request");
  });
  it("get array index", () => {
    const code = jsTs.generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: jsTs.identiferFromString("getZeroIndexElement"),
            document: "Uint8Arrayの0番目の要素を取得する",
            typeParameterList: [],
            parameterList: [
              {
                name: jsTs.identiferFromString("array"),
                document: "Uint8Array",
                type: jsTs.uint8ArrayType,
              },
            ],
            returnType: d.TsType.Number,
            statementList: [
              d.Statement.Return(
                d.TsExpr.Get({
                  expr: d.TsExpr.Variable(jsTs.identiferFromString("array")),
                  propertyExpr: d.TsExpr.NumberLiteral(0),
                })
              ),
            ],
          }),
        ],
        statementList: [],
      },
      "TypeScript"
    );
    console.log(code);
    expect(code).toMatch("[0]");
  });
  const scopedCode = jsTs.generateCodeAsString(
    {
      exportDefinitionList: [],
      statementList: [
        d.Statement.VariableDefinition({
          name: jsTs.identiferFromString("sorena"),
          isConst: false,
          type: d.TsType.String,
          expr: d.TsExpr.StringLiteral("それな"),
        }),
        jsTs.consoleLog(d.TsExpr.Variable(jsTs.identiferFromString("sorena"))),
      ],
    },
    "JavaScript"
  );

  it("statementList in { } scope curly braces", () => {
    console.log(scopedCode);
    expect(scopedCode).toMatch(/\{[^{]*"それな[^}]*\}/u);
  });
  it("ESModules Browser Code not include type ", () => {
    expect(scopedCode).not.toMatch("string");
  });
  it("type parameter", () => {
    const code = jsTs.generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: jsTs.identiferFromString("sample"),
            document: "",
            typeParameterList: [],
            parameterList: [],
            returnType: jsTs.promiseType(d.TsType.String),
            statementList: [],
          }),
        ],
        statementList: [],
      },
      "TypeScript"
    );
    console.log(code);
    expect(code).toMatch("Promise<string>");
  });
  it("object literal key is escaped", () => {
    const code = jsTs.generateCodeAsString(
      {
        exportDefinitionList: [],
        statementList: [
          d.Statement.EvaluateExpr(
            d.TsExpr.ObjectLiteral([
              d.TsMember.KeyValue({
                key: "abc",
                value: d.TsExpr.NumberLiteral(3),
              }),
              d.TsMember.KeyValue({
                key: "a b c",
                value: d.TsExpr.StringLiteral("separated"),
              }),
            ])
          ),
        ],
      },
      "TypeScript"
    );
    console.log(code);
    expect(code).toMatch(/"a b c"/u);
  });
  it("binary operator combine", () => {
    const code = jsTs.generateCodeAsString(
      {
        exportDefinitionList: [],
        statementList: [
          d.Statement.EvaluateExpr(
            jsTs.equal(
              jsTs.equal(
                jsTs.addition(
                  jsTs.multiplication(
                    d.TsExpr.NumberLiteral(3),
                    d.TsExpr.NumberLiteral(9)
                  ),
                  jsTs.multiplication(
                    d.TsExpr.NumberLiteral(7),
                    d.TsExpr.NumberLiteral(6)
                  )
                ),
                jsTs.addition(
                  jsTs.addition(
                    d.TsExpr.NumberLiteral(2),
                    d.TsExpr.NumberLiteral(3)
                  ),
                  jsTs.addition(
                    d.TsExpr.NumberLiteral(5),
                    d.TsExpr.NumberLiteral(8)
                  )
                )
              ),
              jsTs.multiplication(
                d.TsExpr.NumberLiteral(5),
                jsTs.addition(
                  d.TsExpr.NumberLiteral(7),
                  d.TsExpr.NumberLiteral(8)
                )
              )
            )
          ),
        ],
      },
      "JavaScript"
    );
    console.log(code);
    expect(code).toMatch("3 * 9 + 7 * 6 === 2 + 3 + (5 + 8) === 5 * (7 + 8)");
  });
  it("object literal return need parenthesis", () => {
    const code = jsTs.generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: jsTs.identiferFromString("returnObject"),
            document: "",
            typeParameterList: [],
            parameterList: [],
            returnType: d.TsType.Object([
              {
                name: "name",
                required: true,
                type: d.TsType.String,
                document: "",
              },
              {
                name: "age",
                required: true,
                type: d.TsType.Number,
                document: "",
              },
            ]),
            statementList: [
              d.Statement.Return(
                d.TsExpr.ObjectLiteral([
                  d.TsMember.KeyValue({
                    key: "name",
                    value: d.TsExpr.StringLiteral("mac"),
                  }),
                  d.TsMember.KeyValue({
                    key: "age",
                    value: d.TsExpr.NumberLiteral(10),
                  }),
                ])
              ),
            ],
          }),
        ],
        statementList: [],
      },
      "TypeScript"
    );
    console.log(code);
    expect(code).toMatch(/\(\{.*\}\)/u);
  });
  it("let variable", () => {
    const v = jsTs.identiferFromString("v");
    const code = jsTs.generateCodeAsString(
      {
        exportDefinitionList: [],
        statementList: [
          d.Statement.VariableDefinition({
            name: v,
            type: d.TsType.Number,
            expr: d.TsExpr.NumberLiteral(10),
            isConst: false,
          }),
          d.Statement.Set({
            target: d.TsExpr.Variable(v),
            operatorMaybe: d.Maybe.Nothing(),
            expr: d.TsExpr.NumberLiteral(30),
          }),
          d.Statement.Set({
            target: d.TsExpr.Variable(v),
            operatorMaybe: d.Maybe.Just<d.BinaryOperator>("Addition"),
            expr: d.TsExpr.NumberLiteral(1),
          }),
        ],
      },
      "TypeScript"
    );
    console.log(code);
    expect(code).toMatch(/let v: number = 10;[\n ]*v = 30;[\n ]*v \+= 1;/u);
  });
  it("for of", () => {
    const code: d.JsTsCode = {
      exportDefinitionList: [],
      statementList: [
        d.Statement.ForOf({
          elementVariableName: jsTs.identiferFromString("element"),
          iterableExpr: d.TsExpr.ArrayLiteral([
            { expr: d.TsExpr.NumberLiteral(1), spread: false },
            { expr: d.TsExpr.NumberLiteral(2), spread: false },
            {
              expr: d.TsExpr.ArrayLiteral([
                { expr: d.TsExpr.NumberLiteral(3), spread: false },
                { expr: d.TsExpr.NumberLiteral(4), spread: false },
                { expr: d.TsExpr.NumberLiteral(5), spread: false },
              ]),
              spread: true,
            },
          ]),
          statementList: [
            jsTs.consoleLog(
              d.TsExpr.Variable(jsTs.identiferFromString("element"))
            ),
          ],
        }),
      ],
    };
    const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/for .* of \[1, 2, \.\.\.\[3, 4, 5\] *\]/u);
  });
  it("switch", () => {
    const code: d.JsTsCode = {
      exportDefinitionList: [
        d.ExportDefinition.TypeAlias({
          name: jsTs.identiferFromString("Result"),
          document: "Result型",
          typeParameterList: [
            jsTs.identiferFromString("error"),
            jsTs.identiferFromString("ok"),
          ],
          type: d.TsType.Union([
            d.TsType.Object([
              {
                name: "_",
                required: true,
                type: d.TsType.StringLiteral("Ok"),
                document: "",
              },
              {
                name: "ok",
                required: true,
                type: d.TsType.ScopeInFile(jsTs.identiferFromString("ok")),
                document: "",
              },
            ]),
            d.TsType.Object([
              {
                name: "_",
                required: true,
                type: d.TsType.StringLiteral("Error"),
                document: "Error",
              },
              {
                name: "error",
                required: true,
                type: d.TsType.ScopeInFile(jsTs.identiferFromString("error")),
                document: "",
              },
            ]),
          ]),
        }),
        d.ExportDefinition.Function({
          name: jsTs.identiferFromString("switchSample"),
          document: "switch文のテスト",
          typeParameterList: [
            jsTs.identiferFromString("ok"),
            jsTs.identiferFromString("error"),
          ],
          parameterList: [
            {
              name: jsTs.identiferFromString("value"),
              document: "",
              type: d.TsType.WithTypeParameter({
                type: d.TsType.ScopeInGlobal(
                  jsTs.identiferFromString("Result")
                ),
                typeParameterList: [
                  d.TsType.ScopeInFile(jsTs.identiferFromString("ok")),
                  d.TsType.ScopeInFile(jsTs.identiferFromString("error")),
                ],
              }),
            },
          ],
          returnType: d.TsType.String,
          statementList: [
            d.Statement.Switch({
              expr: jsTs.get(
                d.TsExpr.Variable(jsTs.identiferFromString("value")),
                "_"
              ),
              patternList: [
                {
                  caseString: "Ok",
                  statementList: [
                    d.Statement.Return(
                      jsTs.callMethod(
                        jsTs.get(
                          d.TsExpr.Variable(jsTs.identiferFromString("value")),
                          "ok"
                        ),
                        "toString",
                        []
                      )
                    ),
                  ],
                },
                {
                  caseString: "Error",
                  statementList: [
                    d.Statement.Return(
                      jsTs.callMethod(
                        jsTs.get(
                          d.TsExpr.Variable(jsTs.identiferFromString("value")),
                          "error"
                        ),
                        "toString",
                        []
                      )
                    ),
                  ],
                },
              ],
            }),
          ],
        }),
      ],
      statementList: [],
    };
    const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/switch \(.+\) \{\n +case .+:/u);
  });
  it("Type Assertion", () => {
    const code: d.JsTsCode = {
      exportDefinitionList: [],
      statementList: [
        d.Statement.EvaluateExpr(
          d.TsExpr.TypeAssertion({
            expr: d.TsExpr.ObjectLiteral([]),
            type: jsTs.dateType,
          })
        ),
      ],
    };
    const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/as Date/u);
  });
  it("Type Intersection", () => {
    const code: d.JsTsCode = d.JsTsCode.helper({
      exportDefinitionList: [
        d.ExportDefinition.TypeAlias({
          name: jsTs.identiferFromString("SampleIntersectionType"),
          document: "",
          typeParameterList: [],
          type: d.TsType.Intersection({
            left: jsTs.dateType,
            right: jsTs.uint8ArrayType,
          }),
        }),
      ],
      statementList: [],
    });
    const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/Date & Uint8Array/u);
  });

  it("object literal spread syntax", () => {
    const code: d.JsTsCode = {
      exportDefinitionList: [],
      statementList: [
        d.Statement.VariableDefinition({
          name: jsTs.identiferFromString("value"),
          isConst: true,
          type: d.TsType.Object([
            { name: "a", required: true, type: d.TsType.String, document: "" },
            { name: "b", required: true, type: d.TsType.Number, document: "" },
          ]),
          expr: d.TsExpr.ObjectLiteral([
            d.TsMember.KeyValue({
              key: "a",
              value: d.TsExpr.StringLiteral("aValue"),
            }),
            d.TsMember.KeyValue({
              key: "b",
              value: d.TsExpr.NumberLiteral(123),
            }),
          ]),
        }),
        jsTs.consoleLog(
          d.TsExpr.ObjectLiteral([
            d.TsMember.Spread(
              d.TsExpr.Variable(jsTs.identiferFromString("value"))
            ),
            d.TsMember.KeyValue({
              key: "b",
              value: d.TsExpr.NumberLiteral(987),
            }),
          ])
        ),
      ],
    };
    const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/\{ *\.\.\.value *, *b: 987 \}/u);
  });

  it("type property document", () => {
    const code: d.JsTsCode = {
      exportDefinitionList: [
        d.ExportDefinition.TypeAlias({
          name: jsTs.identiferFromString("Time"),
          document: "初期のDefinyで使う時間の内部表現",
          typeParameterList: [],
          type: d.TsType.Object([
            {
              name: "day",
              required: true,
              type: d.TsType.Number,
              document: "1970-01-01からの経過日数. マイナスになることもある",
            },
            {
              name: "millisecond",
              required: true,
              type: d.TsType.Number,
              document: "日にちの中のミリ秒. 0 to 86399999 (=1000*60*60*24-1)",
            },
          ]),
        }),
      ],
      statementList: [],
    };
    const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/日にちの中のミリ秒. 0 to 86399999/u);
  });
});

it("output lambda type parameter", () => {
  const typeParameterIdentifer = jsTs.identiferFromString("t");
  const code: d.JsTsCode = {
    exportDefinitionList: [],
    statementList: [
      d.Statement.VariableDefinition({
        name: jsTs.identiferFromString("sampleFunction"),
        isConst: true,
        type: d.TsType.Function({
          typeParameterList: [typeParameterIdentifer],
          parameterList: [d.TsType.ScopeInFile(typeParameterIdentifer)],
          return: d.TsType.Object([
            {
              name: "value",
              required: true,
              document: "",
              type: d.TsType.ScopeInFile(typeParameterIdentifer),
            },
            {
              name: "s",
              required: true,
              document: "",
              type: d.TsType.WithTypeParameter({
                type: d.TsType.ImportedType({
                  moduleName: "sampleModule",
                  name: jsTs.identiferFromString("Type"),
                }),
                typeParameterList: [d.TsType.Number],
              }),
            },
          ]),
        }),
        expr: d.TsExpr.Lambda({
          parameterList: [
            {
              name: jsTs.identiferFromString("input"),
              type: d.TsType.ScopeInFile(typeParameterIdentifer),
            },
          ],
          typeParameterList: [typeParameterIdentifer],
          returnType: d.TsType.Object([
            {
              name: "value",
              required: true,
              document: "",
              type: d.TsType.ScopeInFile(typeParameterIdentifer),
            },
          ]),
          statementList: [
            d.Statement.Return(
              d.TsExpr.ObjectLiteral([
                d.TsMember.KeyValue({
                  key: "value",
                  value: d.TsExpr.Variable(jsTs.identiferFromString("input")),
                }),
              ])
            ),
          ],
        }),
      }),
    ],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  expect(codeAsString).toMatch(
    /<t extends unknown>\(input: t\): \{ readonly value: t \} =>/u
  );
});

it("output optional type member", () => {
  const code: d.JsTsCode = {
    exportDefinitionList: [
      d.ExportDefinition.Variable({
        name: jsTs.identiferFromString("value"),
        document: "年齢があってもなくてもいいやつ",
        type: d.TsType.Object([
          {
            name: "name",
            required: true,
            document: "名前",
            type: d.TsType.String,
          },
          {
            name: "age",
            required: false,
            document: "年齢",
            type: d.TsType.Number,
          },
        ]),
        expr: d.TsExpr.ObjectLiteral([
          d.TsMember.KeyValue({
            key: "name",
            value: d.TsExpr.StringLiteral("narumincho"),
          }),
        ]),
      }),
    ],
    statementList: [],
  };
  const codeAsString = jsTs.generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  expect(codeAsString).toMatch(/readonly age\?: number/u);
});

it("read me code", () => {
  const serverCode: d.JsTsCode = {
    exportDefinitionList: [
      d.ExportDefinition.Function({
        name: jsTs.identiferFromString("middleware"),
        document: "ミドルウェア",
        typeParameterList: [],
        parameterList: [
          {
            name: jsTs.identiferFromString("request"),
            document: "リクエスト",
            type: d.TsType.ImportedType({
              moduleName: "express",
              name: jsTs.identiferFromString("Request"),
            }),
          },
          {
            name: jsTs.identiferFromString("response"),
            document: "レスポンス",
            type: d.TsType.ImportedType({
              moduleName: "express",
              name: jsTs.identiferFromString("Response"),
            }),
          },
        ],
        returnType: d.TsType.Void,
        statementList: [
          d.Statement.VariableDefinition({
            isConst: true,
            name: jsTs.identiferFromString("accept"),
            type: d.TsType.Union([d.TsType.String, d.TsType.Undefined]),
            expr: jsTs.get(
              jsTs.get(
                d.TsExpr.Variable(jsTs.identiferFromString("request")),
                "headers"
              ),
              "accept"
            ),
          }),
          d.Statement.If({
            condition: jsTs.logicalAnd(
              jsTs.notEqual(
                d.TsExpr.Variable(jsTs.identiferFromString("accept")),
                d.TsExpr.UndefinedLiteral
              ),
              jsTs.callMethod(
                d.TsExpr.Variable(jsTs.identiferFromString("accept")),
                "includes",
                [d.TsExpr.StringLiteral("text/html")]
              )
            ),
            thenStatementList: [
              d.Statement.EvaluateExpr(
                jsTs.callMethod(
                  d.TsExpr.Variable(jsTs.identiferFromString("response")),
                  "setHeader",
                  [
                    d.TsExpr.StringLiteral("content-type"),
                    d.TsExpr.StringLiteral("text/html"),
                  ]
                )
              ),
            ],
          }),
        ],
      }),
    ],
    statementList: [],
  };
  expect(jsTs.generateCodeAsString(serverCode, "TypeScript")).toMatchSnapshot();
});
