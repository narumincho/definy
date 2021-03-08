import * as c from "./codec";
import * as identifer from "js-ts-code-generator/identifer";
import * as int32 from "./int32";
import * as ts from "js-ts-code-generator/data";
import * as tsUtil from "js-ts-code-generator/util";

export const encodeDefinitionStatementList = (
  valueVar: ts.Expr
): ReadonlyArray<ts.Statement> => [
  ts.Statement.Return(
    tsUtil.callMethod(int32.encode(tsUtil.get(valueVar, "length")), "concat", [
      ts.Expr.ArrayLiteral([{ expr: valueVar, spread: true }]),
    ])
  ),
];

export const decodeDefinitionStatementList = (
  parameterIndex: ts.Expr,
  parameterBinary: ts.Expr
): ReadonlyArray<ts.Statement> => {
  const lengthName = identifer.fromString("length");
  const lengthVar = ts.Expr.Variable(lengthName);
  const nextIndexName = identifer.fromString("nextIndex");
  const nextIndexVar = ts.Expr.Variable(nextIndexName);

  return [
    ts.Statement.VariableDefinition({
      isConst: true,
      name: lengthName,
      type: c.decodeReturnType(ts.Type.Number),
      expr: int32.decode(parameterIndex, parameterBinary),
    }),
    ts.Statement.VariableDefinition({
      isConst: true,
      name: nextIndexName,
      type: ts.Type.Number,
      expr: tsUtil.addition(c.getNextIndex(lengthVar), c.getResult(lengthVar)),
    }),
    c.returnStatement(
      tsUtil.callMethod(parameterBinary, "slice", [
        c.getNextIndex(lengthVar),
        nextIndexVar,
      ]),
      nextIndexVar
    ),
  ];
};
