import * as c from "./codec";
import * as ts from "../../data";
import * as util from "../util";
import { jsTs } from "../../gen/main";

const codec: ts.TsExpr = jsTs.get(
  ts.TsExpr.Variable(jsTs.identiferFromString("Int32")),
  util.codecPropertyName
);

export const encode = (target: ts.TsExpr): ts.TsExpr =>
  util.callEncode(codec, target);

export const decode = (index: ts.TsExpr, binary: ts.TsExpr): ts.TsExpr =>
  util.callDecode(codec, index, binary);

/**
 * numberの32bit符号あり整数をSigned Leb128のバイナリに変換するコード
 */
export const encodeDefinitionStatementList = (
  valueVar: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const resultName = jsTs.identiferFromString("result");
  const resultVar = ts.TsExpr.Variable(resultName);
  const byteName = jsTs.identiferFromString("byte");
  const byteVar = ts.TsExpr.Variable(byteName);
  const restName = jsTs.identiferFromString("rest");
  const restVar = ts.TsExpr.Variable(restName);

  return [
    ts.Statement.VariableDefinition({
      isConst: false,
      name: restName,
      type: ts.TsType.Number,
      expr: jsTs.bitwiseOr(valueVar, ts.TsExpr.NumberLiteral(0)),
    }),
    ts.Statement.VariableDefinition({
      isConst: true,
      name: resultName,
      type: jsTs.arrayType(ts.TsType.Number),
      expr: ts.TsExpr.ArrayLiteral([]),
    }),
    ts.Statement.WhileTrue([
      ts.Statement.VariableDefinition({
        isConst: true,
        name: byteName,
        type: ts.TsType.Number,
        expr: jsTs.bitwiseAnd(restVar, ts.TsExpr.NumberLiteral(0x7f)),
      }),
      ts.Statement.Set({
        target: restVar,
        operatorMaybe: ts.Maybe.Just<ts.BinaryOperator>("SignedRightShift"),
        expr: ts.TsExpr.NumberLiteral(7),
      }),
      ts.Statement.If({
        condition: jsTs.logicalOr(
          jsTs.logicalAnd(
            jsTs.equal(restVar, ts.TsExpr.NumberLiteral(0)),
            jsTs.equal(
              jsTs.bitwiseAnd(byteVar, ts.TsExpr.NumberLiteral(0x40)),
              ts.TsExpr.NumberLiteral(0)
            )
          ),
          jsTs.logicalAnd(
            jsTs.equal(restVar, ts.TsExpr.NumberLiteral(-1)),
            jsTs.notEqual(
              jsTs.bitwiseAnd(byteVar, ts.TsExpr.NumberLiteral(0x40)),
              ts.TsExpr.NumberLiteral(0)
            )
          )
        ),
        thenStatementList: [
          ts.Statement.EvaluateExpr(
            jsTs.callMethod(resultVar, "push", [byteVar])
          ),
          ts.Statement.Return(resultVar),
        ],
      }),
      ts.Statement.EvaluateExpr(
        jsTs.callMethod(resultVar, "push", [
          jsTs.bitwiseOr(byteVar, ts.TsExpr.NumberLiteral(0x80)),
        ])
      ),
    ]),
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: ts.TsExpr,
  parameterBinary: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const resultName = jsTs.identiferFromString("result");
  const resultVar = ts.TsExpr.Variable(resultName);
  const offsetName = jsTs.identiferFromString("offset");
  const offsetVar = ts.TsExpr.Variable(offsetName);
  const byteName = jsTs.identiferFromString("byte");
  const byteVar = ts.TsExpr.Variable(byteName);

  return [
    ts.Statement.VariableDefinition({
      isConst: false,
      name: resultName,
      type: ts.TsType.Number,
      expr: ts.TsExpr.NumberLiteral(0),
    }),
    ts.Statement.VariableDefinition({
      isConst: false,
      name: offsetName,
      type: ts.TsType.Number,
      expr: ts.TsExpr.NumberLiteral(0),
    }),
    ts.Statement.WhileTrue([
      ts.Statement.VariableDefinition({
        isConst: true,
        name: byteName,
        type: ts.TsType.Union([ts.TsType.Number, ts.TsType.Undefined]),
        expr: ts.TsExpr.Get({
          expr: parameterBinary,
          propertyExpr: jsTs.addition(parameterIndex, offsetVar),
        }),
      }),
      // もし byteVar が undefined だったら throw する
      ts.Statement.If({
        condition: jsTs.equal(byteVar, ts.TsExpr.UndefinedLiteral),
        thenStatementList: [
          ts.Statement.ThrowError(
            ts.TsExpr.StringLiteral("invalid byte in decode int32")
          ),
        ],
      }),
      ts.Statement.Set({
        target: resultVar,
        operatorMaybe: ts.Maybe.Just<ts.BinaryOperator>("BitwiseOr"),
        expr: jsTs.leftShift(
          jsTs.bitwiseAnd(byteVar, ts.TsExpr.NumberLiteral(0x7f)),
          jsTs.multiplication(offsetVar, ts.TsExpr.NumberLiteral(7))
        ),
      }),
      ts.Statement.Set({
        target: offsetVar,
        operatorMaybe: ts.Maybe.Just<ts.BinaryOperator>("Addition"),
        expr: ts.TsExpr.NumberLiteral(1),
      }),
      ts.Statement.If({
        condition: jsTs.equal(
          jsTs.bitwiseAnd(ts.TsExpr.NumberLiteral(0x80), byteVar),
          ts.TsExpr.NumberLiteral(0)
        ),
        thenStatementList: [
          ts.Statement.If({
            condition: jsTs.logicalAnd(
              jsTs.lessThan(
                jsTs.multiplication(offsetVar, ts.TsExpr.NumberLiteral(7)),
                ts.TsExpr.NumberLiteral(32)
              ),
              jsTs.notEqual(
                jsTs.bitwiseAnd(byteVar, ts.TsExpr.NumberLiteral(0x40)),
                ts.TsExpr.NumberLiteral(0)
              )
            ),
            thenStatementList: [
              c.returnStatement(
                jsTs.bitwiseOr(
                  resultVar,
                  jsTs.leftShift(
                    jsTs.bitwiseNot(ts.TsExpr.NumberLiteral(0)),
                    jsTs.multiplication(offsetVar, ts.TsExpr.NumberLiteral(7))
                  )
                ),
                jsTs.addition(parameterIndex, offsetVar)
              ),
            ],
          }),
          c.returnStatement(
            resultVar,
            jsTs.addition(parameterIndex, offsetVar)
          ),
        ],
      }),
    ]),
  ];
};
