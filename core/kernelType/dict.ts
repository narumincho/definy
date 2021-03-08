import * as c from "./codec";
import * as identifer from "js-ts-code-generator/identifer";
import * as int32 from "./int32";
import * as ts from "js-ts-code-generator/data";
import * as tsUtil from "js-ts-code-generator/util";
import * as util from "../util";

export const name = identifer.fromString("Dict");

export const type = (key: ts.Type, value: ts.Type): ts.Type =>
  tsUtil.readonlyMapType(key, value);

export const encodeDefinitionStatementList = (
  keyTypeParameterName: string,
  valueTypeParameterName: string,
  valueVar: ts.Expr
): ReadonlyArray<ts.Statement> => {
  const resultName = identifer.fromString("result");
  const elementName = identifer.fromString("element");
  const keyCodec = ts.Expr.Variable(c.codecParameterName(keyTypeParameterName));
  const valueCodec = ts.Expr.Variable(
    c.codecParameterName(valueTypeParameterName)
  );
  return [
    ts.Statement.VariableDefinition({
      isConst: false,
      name: resultName,
      type: tsUtil.arrayType(ts.Type.Number),
      expr: ts.Expr.TypeAssertion({
        expr: int32.encode(tsUtil.get(valueVar, "size")),
        type: tsUtil.arrayType(ts.Type.Number),
      }),
    }),
    ts.Statement.ForOf({
      elementVariableName: elementName,
      iterableExpr: valueVar,
      statementList: [
        ts.Statement.Set({
          target: ts.Expr.Variable(resultName),
          operatorMaybe: ts.Maybe.Nothing(),
          expr: ts.Expr.ArrayLiteral([
            {
              expr: ts.Expr.Variable(resultName),
              spread: true,
            },
            {
              expr: util.callEncode(
                keyCodec,
                ts.Expr.Get({
                  expr: ts.Expr.Variable(elementName),
                  propertyExpr: ts.Expr.NumberLiteral(0),
                })
              ),
              spread: true,
            },
            {
              expr: util.callEncode(
                valueCodec,
                ts.Expr.Get({
                  expr: ts.Expr.Variable(elementName),
                  propertyExpr: ts.Expr.NumberLiteral(1),
                })
              ),
              spread: true,
            },
          ]),
        }),
      ],
    }),
    ts.Statement.Return(ts.Expr.Variable(resultName)),
  ];
};

export const decodeDefinitionStatementList = (
  keyTypeParameterName: string,
  valueTypeParameterName: string,
  parameterIndex: ts.Expr,
  parameterBinary: ts.Expr
): ReadonlyArray<ts.Statement> => {
  const keyTypeVar = ts.Type.ScopeInFile(
    identifer.fromString(keyTypeParameterName)
  );
  const valueTypeVar = ts.Type.ScopeInFile(
    identifer.fromString(valueTypeParameterName)
  );
  const resultName = identifer.fromString("result");
  const resultVar = ts.Expr.Variable(resultName);
  const lengthResultName = identifer.fromString("lengthResult");
  const lengthResultVar = ts.Expr.Variable(lengthResultName);
  const keyResultName = identifer.fromString("keyResult");
  const keyResultVar = ts.Expr.Variable(keyResultName);
  const valueResultName = identifer.fromString("valueResult");
  const valueResultVar = ts.Expr.Variable(valueResultName);
  const nextIndexName = identifer.fromString("nextIndex");
  const nextIndexVar = ts.Expr.Variable(nextIndexName);

  return [
    ts.Statement.VariableDefinition({
      isConst: true,
      name: lengthResultName,
      type: c.decodeReturnType(ts.Type.Number),
      expr: int32.decode(parameterIndex, parameterBinary),
    }),
    ts.Statement.VariableDefinition({
      isConst: false,
      name: nextIndexName,
      type: ts.Type.Number,
      expr: c.getNextIndex(lengthResultVar),
    }),
    ts.Statement.VariableDefinition({
      isConst: true,
      name: resultName,
      type: tsUtil.mapType(keyTypeVar, valueTypeVar),
      expr: tsUtil.newMap(ts.Expr.ArrayLiteral([])),
    }),
    ts.Statement.For({
      counterVariableName: identifer.fromString("i"),
      untilExpr: c.getResult(lengthResultVar),
      statementList: [
        ts.Statement.VariableDefinition({
          isConst: true,
          name: keyResultName,
          type: c.decodeReturnType(keyTypeVar),
          expr: util.callDecode(
            ts.Expr.Variable(c.codecParameterName(keyTypeParameterName)),
            nextIndexVar,
            parameterBinary
          ),
        }),
        ts.Statement.VariableDefinition({
          isConst: true,
          name: valueResultName,
          type: c.decodeReturnType(valueTypeVar),
          expr: util.callDecode(
            ts.Expr.Variable(c.codecParameterName(keyTypeParameterName)),
            c.getNextIndex(keyResultVar),
            parameterBinary
          ),
        }),
        ts.Statement.EvaluateExpr(
          tsUtil.callMethod(resultVar, "set", [
            c.getResult(keyResultVar),
            c.getResult(valueResultVar),
          ])
        ),
        ts.Statement.Set({
          target: nextIndexVar,
          operatorMaybe: ts.Maybe.Nothing(),
          expr: c.getNextIndex(valueResultVar),
        }),
      ],
    }),
    c.returnStatement(resultVar, nextIndexVar),
  ];
};
