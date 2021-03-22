import * as c from "./codec";
import * as ts from "../../data";
import * as util from "../util";
import { identifer, util as tsUtil } from "../../gen/jsTs/main";

const codec: ts.TsExpr = tsUtil.get(
  ts.TsExpr.Variable(identifer.fromString("Int32")),
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
  const resultName = identifer.fromString("result");
  const resultVar = ts.TsExpr.Variable(resultName);
  const byteName = identifer.fromString("byte");
  const byteVar = ts.TsExpr.Variable(byteName);
  const restName = identifer.fromString("rest");
  const restVar = ts.TsExpr.Variable(restName);

  return [
    ts.Statement.VariableDefinition({
      isConst: false,
      name: restName,
      type: ts.TsType.Number,
      expr: tsUtil.bitwiseOr(valueVar, ts.TsExpr.NumberLiteral(0)),
    }),
    ts.Statement.VariableDefinition({
      isConst: true,
      name: resultName,
      type: tsUtil.arrayType(ts.TsType.Number),
      expr: ts.TsExpr.ArrayLiteral([]),
    }),
    ts.Statement.WhileTrue([
      ts.Statement.VariableDefinition({
        isConst: true,
        name: byteName,
        type: ts.TsType.Number,
        expr: tsUtil.bitwiseAnd(restVar, ts.TsExpr.NumberLiteral(0x7f)),
      }),
      ts.Statement.Set({
        target: restVar,
        operatorMaybe: ts.Maybe.Just<ts.BinaryOperator>("SignedRightShift"),
        expr: ts.TsExpr.NumberLiteral(7),
      }),
      ts.Statement.If({
        condition: tsUtil.logicalOr(
          tsUtil.logicalAnd(
            tsUtil.equal(restVar, ts.TsExpr.NumberLiteral(0)),
            tsUtil.equal(
              tsUtil.bitwiseAnd(byteVar, ts.TsExpr.NumberLiteral(0x40)),
              ts.TsExpr.NumberLiteral(0)
            )
          ),
          tsUtil.logicalAnd(
            tsUtil.equal(restVar, ts.TsExpr.NumberLiteral(-1)),
            tsUtil.notEqual(
              tsUtil.bitwiseAnd(byteVar, ts.TsExpr.NumberLiteral(0x40)),
              ts.TsExpr.NumberLiteral(0)
            )
          )
        ),
        thenStatementList: [
          ts.Statement.EvaluateExpr(
            tsUtil.callMethod(resultVar, "push", [byteVar])
          ),
          ts.Statement.Return(resultVar),
        ],
      }),
      ts.Statement.EvaluateExpr(
        tsUtil.callMethod(resultVar, "push", [
          tsUtil.bitwiseOr(byteVar, ts.TsExpr.NumberLiteral(0x80)),
        ])
      ),
    ]),
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: ts.TsExpr,
  parameterBinary: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const resultName = identifer.fromString("result");
  const resultVar = ts.TsExpr.Variable(resultName);
  const offsetName = identifer.fromString("offset");
  const offsetVar = ts.TsExpr.Variable(offsetName);
  const byteName = identifer.fromString("byte");
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
          propertyExpr: tsUtil.addition(parameterIndex, offsetVar),
        }),
      }),
      // もし byteVar が undefined だったら throw する
      ts.Statement.If({
        condition: tsUtil.equal(byteVar, ts.TsExpr.UndefinedLiteral),
        thenStatementList: [
          ts.Statement.ThrowError(
            ts.TsExpr.StringLiteral("invalid byte in decode int32")
          ),
        ],
      }),
      ts.Statement.Set({
        target: resultVar,
        operatorMaybe: ts.Maybe.Just<ts.BinaryOperator>("BitwiseOr"),
        expr: tsUtil.leftShift(
          tsUtil.bitwiseAnd(byteVar, ts.TsExpr.NumberLiteral(0x7f)),
          tsUtil.multiplication(offsetVar, ts.TsExpr.NumberLiteral(7))
        ),
      }),
      ts.Statement.Set({
        target: offsetVar,
        operatorMaybe: ts.Maybe.Just<ts.BinaryOperator>("Addition"),
        expr: ts.TsExpr.NumberLiteral(1),
      }),
      ts.Statement.If({
        condition: tsUtil.equal(
          tsUtil.bitwiseAnd(ts.TsExpr.NumberLiteral(0x80), byteVar),
          ts.TsExpr.NumberLiteral(0)
        ),
        thenStatementList: [
          ts.Statement.If({
            condition: tsUtil.logicalAnd(
              tsUtil.lessThan(
                tsUtil.multiplication(offsetVar, ts.TsExpr.NumberLiteral(7)),
                ts.TsExpr.NumberLiteral(32)
              ),
              tsUtil.notEqual(
                tsUtil.bitwiseAnd(byteVar, ts.TsExpr.NumberLiteral(0x40)),
                ts.TsExpr.NumberLiteral(0)
              )
            ),
            thenStatementList: [
              c.returnStatement(
                tsUtil.bitwiseOr(
                  resultVar,
                  tsUtil.leftShift(
                    tsUtil.bitwiseNot(ts.TsExpr.NumberLiteral(0)),
                    tsUtil.multiplication(offsetVar, ts.TsExpr.NumberLiteral(7))
                  )
                ),
                tsUtil.addition(parameterIndex, offsetVar)
              ),
            ],
          }),
          c.returnStatement(
            resultVar,
            tsUtil.addition(parameterIndex, offsetVar)
          ),
        ],
      }),
    ]),
  ];
};
