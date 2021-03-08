import * as c from "./codec";
import * as identifer from "js-ts-code-generator/identifer";
import * as ts from "js-ts-code-generator/data";
import * as tsUtil from "js-ts-code-generator/util";
import * as util from "../util";

const codec: ts.Expr = tsUtil.get(
  ts.Expr.Variable(identifer.fromString("Int32")),
  util.codecPropertyName
);

export const encode = (target: ts.Expr): ts.Expr =>
  util.callEncode(codec, target);

export const decode = (index: ts.Expr, binary: ts.Expr): ts.Expr =>
  util.callDecode(codec, index, binary);

/**
 * numberの32bit符号あり整数をSigned Leb128のバイナリに変換するコード
 */
export const encodeDefinitionStatementList = (
  valueVar: ts.Expr
): ReadonlyArray<ts.Statement> => {
  const resultName = identifer.fromString("result");
  const resultVar = ts.Expr.Variable(resultName);
  const byteName = identifer.fromString("byte");
  const byteVar = ts.Expr.Variable(byteName);
  const restName = identifer.fromString("rest");
  const restVar = ts.Expr.Variable(restName);

  return [
    ts.Statement.VariableDefinition({
      isConst: false,
      name: restName,
      type: ts.Type.Number,
      expr: tsUtil.bitwiseOr(valueVar, ts.Expr.NumberLiteral(0)),
    }),
    ts.Statement.VariableDefinition({
      isConst: true,
      name: resultName,
      type: tsUtil.arrayType(ts.Type.Number),
      expr: ts.Expr.ArrayLiteral([]),
    }),
    ts.Statement.WhileTrue([
      ts.Statement.VariableDefinition({
        isConst: true,
        name: byteName,
        type: ts.Type.Number,
        expr: tsUtil.bitwiseAnd(restVar, ts.Expr.NumberLiteral(0x7f)),
      }),
      ts.Statement.Set({
        target: restVar,
        operatorMaybe: ts.Maybe.Just<ts.BinaryOperator>("SignedRightShift"),
        expr: ts.Expr.NumberLiteral(7),
      }),
      ts.Statement.If({
        condition: tsUtil.logicalOr(
          tsUtil.logicalAnd(
            tsUtil.equal(restVar, ts.Expr.NumberLiteral(0)),
            tsUtil.equal(
              tsUtil.bitwiseAnd(byteVar, ts.Expr.NumberLiteral(0x40)),
              ts.Expr.NumberLiteral(0)
            )
          ),
          tsUtil.logicalAnd(
            tsUtil.equal(restVar, ts.Expr.NumberLiteral(-1)),
            tsUtil.notEqual(
              tsUtil.bitwiseAnd(byteVar, ts.Expr.NumberLiteral(0x40)),
              ts.Expr.NumberLiteral(0)
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
          tsUtil.bitwiseOr(byteVar, ts.Expr.NumberLiteral(0x80)),
        ])
      ),
    ]),
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: ts.Expr,
  parameterBinary: ts.Expr
): ReadonlyArray<ts.Statement> => {
  const resultName = identifer.fromString("result");
  const resultVar = ts.Expr.Variable(resultName);
  const offsetName = identifer.fromString("offset");
  const offsetVar = ts.Expr.Variable(offsetName);
  const byteName = identifer.fromString("byte");
  const byteVar = ts.Expr.Variable(byteName);

  return [
    ts.Statement.VariableDefinition({
      isConst: false,
      name: resultName,
      type: ts.Type.Number,
      expr: ts.Expr.NumberLiteral(0),
    }),
    ts.Statement.VariableDefinition({
      isConst: false,
      name: offsetName,
      type: ts.Type.Number,
      expr: ts.Expr.NumberLiteral(0),
    }),
    ts.Statement.WhileTrue([
      ts.Statement.VariableDefinition({
        isConst: true,
        name: byteName,
        type: ts.Type.Union([ts.Type.Number, ts.Type.Undefined]),
        expr: ts.Expr.Get({
          expr: parameterBinary,
          propertyExpr: tsUtil.addition(parameterIndex, offsetVar),
        }),
      }),
      // もし byteVar が undefined だったら throw する
      ts.Statement.If({
        condition: tsUtil.equal(byteVar, ts.Expr.UndefinedLiteral),
        thenStatementList: [
          ts.Statement.ThrowError(
            ts.Expr.StringLiteral("invalid byte in decode int32")
          ),
        ],
      }),
      ts.Statement.Set({
        target: resultVar,
        operatorMaybe: ts.Maybe.Just<ts.BinaryOperator>("BitwiseOr"),
        expr: tsUtil.leftShift(
          tsUtil.bitwiseAnd(byteVar, ts.Expr.NumberLiteral(0x7f)),
          tsUtil.multiplication(offsetVar, ts.Expr.NumberLiteral(7))
        ),
      }),
      ts.Statement.Set({
        target: offsetVar,
        operatorMaybe: ts.Maybe.Just<ts.BinaryOperator>("Addition"),
        expr: ts.Expr.NumberLiteral(1),
      }),
      ts.Statement.If({
        condition: tsUtil.equal(
          tsUtil.bitwiseAnd(ts.Expr.NumberLiteral(0x80), byteVar),
          ts.Expr.NumberLiteral(0)
        ),
        thenStatementList: [
          ts.Statement.If({
            condition: tsUtil.logicalAnd(
              tsUtil.lessThan(
                tsUtil.multiplication(offsetVar, ts.Expr.NumberLiteral(7)),
                ts.Expr.NumberLiteral(32)
              ),
              tsUtil.notEqual(
                tsUtil.bitwiseAnd(byteVar, ts.Expr.NumberLiteral(0x40)),
                ts.Expr.NumberLiteral(0)
              )
            ),
            thenStatementList: [
              c.returnStatement(
                tsUtil.bitwiseOr(
                  resultVar,
                  tsUtil.leftShift(
                    tsUtil.bitwiseNot(ts.Expr.NumberLiteral(0)),
                    tsUtil.multiplication(offsetVar, ts.Expr.NumberLiteral(7))
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
