import { d, generateCodeAsString, identifer, util } from "../gen/jsTs/main";

describe("test", () => {
  const expressRequest = d.TsType.ImportedType({
    moduleName: "express",
    name: identifer.fromString("Request"),
  });
  const expressResponse = d.TsType.ImportedType({
    moduleName: "express",
    name: identifer.fromString("Response"),
  });

  const sampleCode: d.JsTsCode = {
    exportDefinitionList: [
      d.ExportDefinition.Function({
        name: identifer.fromString("middleware"),
        typeParameterList: [],
        parameterList: [
          {
            name: identifer.fromString("request"),
            document: "expressのリクエスト",
            type: expressRequest,
          },
          {
            name: identifer.fromString("response"),
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
  const nodeJsTypeScriptCode = generateCodeAsString(sampleCode, "TypeScript");
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
    const codeAsString = generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: identifer.fromString("new"),
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
    const codeAsString = generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: identifer.fromString("0name"),
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
      let index = identifer.initialIdentiferIndex;
      for (let i = 0; i < 999; i += 1) {
        const createIdentiferResult = identifer.createIdentifer(
          index,
          reserved
        );
        index = createIdentiferResult.nextIdentiferIndex;
        if (!identifer.isIdentifer(createIdentiferResult.identifer.string)) {
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
          name: identifer.fromString("stringValue"),
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
    const codeAsString = generateCodeAsString(nodeJsCode, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/\\"/u);
    expect(codeAsString).toMatch(/\\n/u);
  });

  it("include function parameter name", () => {
    const nodeJsCode: d.JsTsCode = {
      exportDefinitionList: [
        d.ExportDefinition.Function({
          name: identifer.fromString("middleware"),
          document: "ミドルウェア",
          typeParameterList: [],
          parameterList: [
            {
              name: identifer.fromString("request"),
              document: "リクエスト",
              type: d.TsType.ImportedType({
                moduleName: "express",
                name: identifer.fromString("Request"),
              }),
            },
            {
              name: identifer.fromString("response"),
              document: "レスポンス",
              type: d.TsType.ImportedType({
                moduleName: "express",
                name: identifer.fromString("Response"),
              }),
            },
          ],
          returnType: d.TsType.Void,
          statementList: [
            d.Statement.VariableDefinition({
              name: identifer.fromString("accept"),
              type: d.TsType.Union([d.TsType.String, d.TsType.Undefined]),
              isConst: true,
              expr: util.get(
                util.get(
                  d.TsExpr.Variable(identifer.fromString("request")),
                  "headers"
                ),
                "accept"
              ),
            }),
            d.Statement.If({
              condition: d.TsExpr.BinaryOperator({
                left: d.TsExpr.BinaryOperator({
                  left: d.TsExpr.Variable(identifer.fromString("accept")),
                  operator: "NotEqual",
                  right: d.TsExpr.UndefinedLiteral,
                }),
                operator: "LogicalAnd",
                right: util.callMethod(
                  d.TsExpr.Variable(identifer.fromString("accept")),
                  "includes",
                  [d.TsExpr.StringLiteral("text/html")]
                ),
              }),
              thenStatementList: [
                d.Statement.EvaluateExpr(
                  util.callMethod(
                    d.TsExpr.Variable(identifer.fromString("response")),
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
    const code = generateCodeAsString(nodeJsCode, "TypeScript");
    console.log(code);
    expect(code).toMatch("request");
  });
  it("get array index", () => {
    const code = generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: identifer.fromString("getZeroIndexElement"),
            document: "Uint8Arrayの0番目の要素を取得する",
            typeParameterList: [],
            parameterList: [
              {
                name: identifer.fromString("array"),
                document: "Uint8Array",
                type: util.uint8ArrayType,
              },
            ],
            returnType: d.TsType.Number,
            statementList: [
              d.Statement.Return(
                d.TsExpr.Get({
                  expr: d.TsExpr.Variable(identifer.fromString("array")),
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
  const scopedCode = generateCodeAsString(
    {
      exportDefinitionList: [],
      statementList: [
        d.Statement.VariableDefinition({
          name: identifer.fromString("sorena"),
          isConst: false,
          type: d.TsType.String,
          expr: d.TsExpr.StringLiteral("それな"),
        }),
        util.consoleLog(d.TsExpr.Variable(identifer.fromString("sorena"))),
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
    const code = generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: identifer.fromString("sample"),
            document: "",
            typeParameterList: [],
            parameterList: [],
            returnType: util.promiseType(d.TsType.String),
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
    const code = generateCodeAsString(
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
    const code = generateCodeAsString(
      {
        exportDefinitionList: [],
        statementList: [
          d.Statement.EvaluateExpr(
            util.equal(
              util.equal(
                util.addition(
                  util.multiplication(
                    d.TsExpr.NumberLiteral(3),
                    d.TsExpr.NumberLiteral(9)
                  ),
                  util.multiplication(
                    d.TsExpr.NumberLiteral(7),
                    d.TsExpr.NumberLiteral(6)
                  )
                ),
                util.addition(
                  util.addition(
                    d.TsExpr.NumberLiteral(2),
                    d.TsExpr.NumberLiteral(3)
                  ),
                  util.addition(
                    d.TsExpr.NumberLiteral(5),
                    d.TsExpr.NumberLiteral(8)
                  )
                )
              ),
              util.multiplication(
                d.TsExpr.NumberLiteral(5),
                util.addition(
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
    const code = generateCodeAsString(
      {
        exportDefinitionList: [
          d.ExportDefinition.Function({
            name: identifer.fromString("returnObject"),
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
    const v = identifer.fromString("v");
    const code = generateCodeAsString(
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
          elementVariableName: identifer.fromString("element"),
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
            util.consoleLog(d.TsExpr.Variable(identifer.fromString("element"))),
          ],
        }),
      ],
    };
    const codeAsString = generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/for .* of \[1, 2, \.\.\.\[3, 4, 5\] *\]/u);
  });
  it("switch", () => {
    const code: d.JsTsCode = {
      exportDefinitionList: [
        d.ExportDefinition.TypeAlias({
          name: identifer.fromString("Result"),
          document: "Result型",
          typeParameterList: [
            identifer.fromString("error"),
            identifer.fromString("ok"),
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
                type: d.TsType.ScopeInFile(identifer.fromString("ok")),
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
                type: d.TsType.ScopeInFile(identifer.fromString("error")),
                document: "",
              },
            ]),
          ]),
        }),
        d.ExportDefinition.Function({
          name: identifer.fromString("switchSample"),
          document: "switch文のテスト",
          typeParameterList: [
            identifer.fromString("ok"),
            identifer.fromString("error"),
          ],
          parameterList: [
            {
              name: identifer.fromString("value"),
              document: "",
              type: d.TsType.WithTypeParameter({
                type: d.TsType.ScopeInGlobal(identifer.fromString("Result")),
                typeParameterList: [
                  d.TsType.ScopeInFile(identifer.fromString("ok")),
                  d.TsType.ScopeInFile(identifer.fromString("error")),
                ],
              }),
            },
          ],
          returnType: d.TsType.String,
          statementList: [
            d.Statement.Switch({
              expr: util.get(
                d.TsExpr.Variable(identifer.fromString("value")),
                "_"
              ),
              patternList: [
                {
                  caseString: "Ok",
                  statementList: [
                    d.Statement.Return(
                      util.callMethod(
                        util.get(
                          d.TsExpr.Variable(identifer.fromString("value")),
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
                      util.callMethod(
                        util.get(
                          d.TsExpr.Variable(identifer.fromString("value")),
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
    const codeAsString = generateCodeAsString(code, "TypeScript");
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
            type: util.dateType,
          })
        ),
      ],
    };
    const codeAsString = generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/as Date/u);
  });
  it("Type Intersection", () => {
    const code: d.JsTsCode = d.JsTsCode.helper({
      exportDefinitionList: [
        d.ExportDefinition.TypeAlias({
          name: identifer.fromString("SampleIntersectionType"),
          document: "",
          typeParameterList: [],
          type: d.TsType.Intersection({
            left: util.dateType,
            right: util.uint8ArrayType,
          }),
        }),
      ],
      statementList: [],
    });
    const codeAsString = generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/Date & Uint8Array/u);
  });

  it("object literal spread syntax", () => {
    const code: d.JsTsCode = {
      exportDefinitionList: [],
      statementList: [
        d.Statement.VariableDefinition({
          name: identifer.fromString("value"),
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
        util.consoleLog(
          d.TsExpr.ObjectLiteral([
            d.TsMember.Spread(d.TsExpr.Variable(identifer.fromString("value"))),
            d.TsMember.KeyValue({
              key: "b",
              value: d.TsExpr.NumberLiteral(987),
            }),
          ])
        ),
      ],
    };
    const codeAsString = generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/\{ *\.\.\.value *, *b: 987 \}/u);
  });

  it("type property document", () => {
    const code: d.JsTsCode = {
      exportDefinitionList: [
        d.ExportDefinition.TypeAlias({
          name: identifer.fromString("Time"),
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
    const codeAsString = generateCodeAsString(code, "TypeScript");
    console.log(codeAsString);
    expect(codeAsString).toMatch(/日にちの中のミリ秒. 0 to 86399999/u);
  });
});

it("output lambda type parameter", () => {
  const typeParameterIdentifer = identifer.fromString("t");
  const code: d.JsTsCode = {
    exportDefinitionList: [],
    statementList: [
      d.Statement.VariableDefinition({
        name: identifer.fromString("sampleFunction"),
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
                  name: identifer.fromString("Type"),
                }),
                typeParameterList: [d.TsType.Number],
              }),
            },
          ]),
        }),
        expr: d.TsExpr.Lambda({
          parameterList: [
            {
              name: identifer.fromString("input"),
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
                  value: d.TsExpr.Variable(identifer.fromString("input")),
                }),
              ])
            ),
          ],
        }),
      }),
    ],
  };
  const codeAsString = generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  expect(codeAsString).toMatch(
    /<t extends unknown>\(input: t\): \{ readonly value: t \} =>/u
  );
});

it("output optional type member", () => {
  const code: d.JsTsCode = {
    exportDefinitionList: [
      d.ExportDefinition.Variable({
        name: identifer.fromString("value"),
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
  const codeAsString = generateCodeAsString(code, "TypeScript");
  console.log(codeAsString);
  expect(codeAsString).toMatch(/readonly age\?: number/u);
});

it("read me code", () => {
  const serverCode: d.JsTsCode = {
    exportDefinitionList: [
      d.ExportDefinition.Function({
        name: identifer.fromString("middleware"),
        document: "ミドルウェア",
        typeParameterList: [],
        parameterList: [
          {
            name: identifer.fromString("request"),
            document: "リクエスト",
            type: d.TsType.ImportedType({
              moduleName: "express",
              name: identifer.fromString("Request"),
            }),
          },
          {
            name: identifer.fromString("response"),
            document: "レスポンス",
            type: d.TsType.ImportedType({
              moduleName: "express",
              name: identifer.fromString("Response"),
            }),
          },
        ],
        returnType: d.TsType.Void,
        statementList: [
          d.Statement.VariableDefinition({
            isConst: true,
            name: identifer.fromString("accept"),
            type: d.TsType.Union([d.TsType.String, d.TsType.Undefined]),
            expr: util.get(
              util.get(
                d.TsExpr.Variable(identifer.fromString("request")),
                "headers"
              ),
              "accept"
            ),
          }),
          d.Statement.If({
            condition: util.logicalAnd(
              util.notEqual(
                d.TsExpr.Variable(identifer.fromString("accept")),
                d.TsExpr.UndefinedLiteral
              ),
              util.callMethod(
                d.TsExpr.Variable(identifer.fromString("accept")),
                "includes",
                [d.TsExpr.StringLiteral("text/html")]
              )
            ),
            thenStatementList: [
              d.Statement.EvaluateExpr(
                util.callMethod(
                  d.TsExpr.Variable(identifer.fromString("response")),
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
  expect(generateCodeAsString(serverCode, "TypeScript")).toMatchSnapshot();
});
