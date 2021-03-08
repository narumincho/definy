import * as c from "./codec";
import * as identifer from "js-ts-code-generator/identifer";
import * as int32 from "./int32";
import * as ts from "js-ts-code-generator/data";
import * as tsUtil from "js-ts-code-generator/util";
import * as util from "../util";

export const name = identifer.fromString("List");

export const type = (element: ts.Type): ts.Type =>
  tsUtil.readonlyArrayType(element);

export const encodeDefinitionStatementList = (
  typeParameterName: string,
  valueVar: ts.Expr
): ReadonlyArray<ts.Statement> => {
  const resultName = identifer.fromString("result");
  const elementName = identifer.fromString("element");
  return [
    ts.Statement.VariableDefinition({
      isConst: false,
      name: resultName,
      type: tsUtil.arrayType(ts.Type.Number),
      expr: ts.Expr.TypeAssertion({
        expr: int32.encode(tsUtil.get(valueVar, "length")),
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
          expr: tsUtil.callMethod(ts.Expr.Variable(resultName), "concat", [
            util.callEncode(
              ts.Expr.Variable(c.codecParameterName(typeParameterName)),
              ts.Expr.Variable(elementName)
            ),
          ]),
        }),
      ],
    }),
    ts.Statement.Return(ts.Expr.Variable(resultName)),
  ];
};

export const decodeDefinitionStatementList = (
  typeParameterName: string,
  parameterIndex: ts.Expr,
  parameterBinary: ts.Expr
): ReadonlyArray<ts.Statement> => {
  const elementTypeVar = ts.Type.ScopeInFile(
    identifer.fromString(typeParameterName)
  );
  const resultName = identifer.fromString("result");
  const resultVar = ts.Expr.Variable(resultName);
  const lengthResultName = identifer.fromString("lengthResult");
  const lengthResultVar = ts.Expr.Variable(lengthResultName);
  const resultAndNextIndexName = identifer.fromString("resultAndNextIndex");
  const resultAndNextIndexVar = ts.Expr.Variable(resultAndNextIndexName);
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
      type: tsUtil.arrayType(elementTypeVar),
      expr: ts.Expr.ArrayLiteral([]),
    }),
    ts.Statement.For({
      counterVariableName: identifer.fromString("i"),
      untilExpr: c.getResult(lengthResultVar),
      statementList: [
        ts.Statement.VariableDefinition({
          isConst: true,
          name: resultAndNextIndexName,
          type: c.decodeReturnType(elementTypeVar),
          expr: util.callDecode(
            ts.Expr.Variable(c.codecParameterName(typeParameterName)),
            nextIndexVar,
            parameterBinary
          ),
        }),
        ts.Statement.EvaluateExpr(
          tsUtil.callMethod(resultVar, "push", [
            c.getResult(resultAndNextIndexVar),
          ])
        ),
        ts.Statement.Set({
          target: nextIndexVar,
          operatorMaybe: ts.Maybe.Nothing(),
          expr: c.getNextIndex(resultAndNextIndexVar),
        }),
      ],
    }),
    c.returnStatement(resultVar, nextIndexVar),
  ];
};
