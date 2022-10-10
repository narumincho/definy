import * as c from "./codec";
import * as util from "../util";
import { jsTs } from "../../deno-lib/npm";

const codec: jsTs.data.TsExpr = jsTs.get(
  jsTs.variable(jsTs.identifierFromString("Int32")),
  util.codecPropertyName
);

export const encode = (target: jsTs.data.TsExpr): jsTs.data.TsExpr =>
  util.callEncode(codec, target);

export const decode = (
  index: jsTs.data.TsExpr,
  binary: jsTs.data.TsExpr
): jsTs.data.TsExpr => util.callDecode(codec, index, binary);

/**
 * numberの32bit符号あり整数をSigned Leb128のバイナリに変換するコード
 */
export const encodeDefinitionStatementList = (
  valueVar: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const resultName = jsTs.identifierFromString("result");
  const resultVar = jsTs.variable(resultName);
  const byteName = jsTs.identifierFromString("byte");
  const byteVar = jsTs.variable(byteName);
  const restName = jsTs.identifierFromString("rest");
  const restVar = jsTs.variable(restName);

  return [
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: false,
        name: restName,
        type: { _: "Number" },
        expr: jsTs.bitwiseOr(valueVar, { _: "NumberLiteral", int32: 0 }),
      },
    },
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: true,
        name: resultName,
        type: jsTs.arrayType({ _: "Number" }),
        expr: { _: "ArrayLiteral", arrayItemList: [] },
      },
    },
    {
      _: "WhileTrue",
      statementList: [
        {
          _: "VariableDefinition",
          variableDefinitionStatement: {
            isConst: true,
            name: byteName,
            type: { _: "Number" },
            expr: jsTs.bitwiseAnd(restVar, { _: "NumberLiteral", int32: 0x7f }),
          },
        },
        {
          _: "Set",
          setStatement: {
            target: restVar,
            operatorMaybe: "SignedRightShift",
            expr: { _: "NumberLiteral", int32: 7 },
          },
        },
        {
          _: "If",
          ifStatement: {
            condition: jsTs.logicalOr(
              jsTs.logicalAnd(
                jsTs.equal(restVar, { _: "NumberLiteral", int32: 0 }),
                jsTs.equal(
                  jsTs.bitwiseAnd(byteVar, { _: "NumberLiteral", int32: 0x40 }),
                  { _: "NumberLiteral", int32: 0 }
                )
              ),
              jsTs.logicalAnd(
                jsTs.equal(restVar, { _: "NumberLiteral", int32: -1 }),
                jsTs.notEqual(
                  jsTs.bitwiseAnd(byteVar, { _: "NumberLiteral", int32: 0x40 }),
                  { _: "NumberLiteral", int32: 0 }
                )
              )
            ),
            thenStatementList: [
              jsTs.statementEvaluateExpr(
                jsTs.callMethod(resultVar, "push", [byteVar])
              ),
              jsTs.statementReturn(resultVar),
            ],
          },
        },
        jsTs.statementEvaluateExpr(
          jsTs.callMethod(resultVar, "push", [
            jsTs.bitwiseOr(byteVar, { _: "NumberLiteral", int32: 0x80 }),
          ])
        ),
      ],
    },
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const resultName = jsTs.identifierFromString("result");
  const resultVar = jsTs.variable(resultName);
  const offsetName = jsTs.identifierFromString("offset");
  const offsetVar = jsTs.variable(offsetName);
  const byteName = jsTs.identifierFromString("byte");
  const byteVar = jsTs.variable(byteName);

  return [
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: false,
        name: resultName,
        type: { _: "Number" },
        expr: { _: "NumberLiteral", int32: 0 },
      },
    },
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: false,
        name: offsetName,
        type: { _: "Number" },
        expr: { _: "NumberLiteral", int32: 0 },
      },
    },
    {
      _: "WhileTrue",
      statementList: [
        {
          _: "VariableDefinition",
          variableDefinitionStatement: {
            isConst: true,
            name: byteName,
            type: {
              _: "Union",
              tsTypeList: [{ _: "Number" }, { _: "Undefined" }],
            },
            expr: {
              _: "Get",
              getExpr: {
                expr: parameterBinary,
                propertyExpr: jsTs.addition(parameterIndex, offsetVar),
              },
            },
          },
        },
        // もし byteVar が undefined だったら throw する
        {
          _: "If",
          ifStatement: {
            condition: jsTs.equal(byteVar, { _: "UndefinedLiteral" }),
            thenStatementList: [
              {
                _: "ThrowError",
                tsExpr: {
                  _: "StringLiteral",
                  string: "invalid byte in decode int32",
                },
              },
            ],
          },
        },
        {
          _: "Set",
          setStatement: {
            target: resultVar,
            operatorMaybe: "BitwiseOr",
            expr: jsTs.leftShift(
              jsTs.bitwiseAnd(byteVar, { _: "NumberLiteral", int32: 0x7f }),
              jsTs.multiplication(offsetVar, { _: "NumberLiteral", int32: 7 })
            ),
          },
        },
        {
          _: "Set",
          setStatement: {
            target: offsetVar,
            operatorMaybe: "Addition",
            expr: { _: "NumberLiteral", int32: 1 },
          },
        },
        {
          _: "If",
          ifStatement: {
            condition: jsTs.equal(
              jsTs.bitwiseAnd({ _: "NumberLiteral", int32: 0x80 }, byteVar),
              { _: "NumberLiteral", int32: 0 }
            ),
            thenStatementList: [
              {
                _: "If",
                ifStatement: {
                  condition: jsTs.logicalAnd(
                    jsTs.lessThan(
                      jsTs.multiplication(offsetVar, {
                        _: "NumberLiteral",
                        int32: 7,
                      }),
                      { _: "NumberLiteral", int32: 32 }
                    ),
                    jsTs.notEqual(
                      jsTs.bitwiseAnd(byteVar, {
                        _: "NumberLiteral",
                        int32: 0x40,
                      }),
                      { _: "NumberLiteral", int32: 0 }
                    )
                  ),
                  thenStatementList: [
                    c.returnStatement(
                      jsTs.bitwiseOr(
                        resultVar,
                        jsTs.leftShift(
                          jsTs.bitwiseNot({ _: "NumberLiteral", int32: 0 }),
                          jsTs.multiplication(offsetVar, {
                            _: "NumberLiteral",
                            int32: 7,
                          })
                        )
                      ),
                      jsTs.addition(parameterIndex, offsetVar)
                    ),
                  ],
                },
              },
              c.returnStatement(
                resultVar,
                jsTs.addition(parameterIndex, offsetVar)
              ),
            ],
          },
        },
      ],
    },
  ];
};
