import * as c from "./codec";
import * as identifer from "js-ts-code-generator/identifer";
import * as int32 from "./int32";
import * as ts from "js-ts-code-generator/data";
import * as tsUtil from "js-ts-code-generator/util";
import * as util from "../util";

const name = identifer.fromString("String");

export const type = ts.Type.String;

export const codec = (): ts.Expr =>
  tsUtil.get(ts.Expr.Variable(name), util.codecPropertyName);

export const encodeDefinitionStatementList = (
  valueVar: ts.Expr
): ReadonlyArray<ts.Statement> => {
  const resultName = identifer.fromString("result");
  const resultVar = ts.Expr.Variable(resultName);

  return [
    ts.Statement.VariableDefinition({
      isConst: true,
      name: resultName,
      type: tsUtil.readonlyArrayType(ts.Type.Number),
      expr: ts.Expr.ArrayLiteral([
        {
          expr: tsUtil.callMethod(
            ts.Expr.New({
              expr: ts.Expr.GlobalObjects(identifer.fromString("TextEncoder")),
              parameterList: [],
            }),
            "encode",
            [valueVar]
          ),
          spread: true,
        },
      ]),
    }),
    ts.Statement.Return(
      tsUtil.callMethod(
        int32.encode(tsUtil.get(resultVar, "length")),
        "concat",
        [resultVar]
      )
    ),
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: ts.Expr,
  parameterBinary: ts.Expr
): ReadonlyArray<ts.Statement> => {
  const lengthName = identifer.fromString("length");
  const lengthVar = ts.Expr.Variable(lengthName);
  const nextIndexName = identifer.fromString("nextIndex");
  const nextIndexVar = ts.Expr.Variable(nextIndexName);
  const textBinaryName = identifer.fromString("textBinary");
  const textBinaryVar = ts.Expr.Variable(textBinaryName);

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
    ts.Statement.VariableDefinition({
      isConst: true,
      name: textBinaryName,
      type: tsUtil.uint8ArrayType,
      expr: tsUtil.callMethod(parameterBinary, "slice", [
        c.getNextIndex(lengthVar),
        nextIndexVar,
      ]),
    }),
    c.returnStatement(
      tsUtil.callMethod(
        ts.Expr.New({
          expr: ts.Expr.GlobalObjects(identifer.fromString("TextDecoder")),
          parameterList: [],
        }),
        "decode",
        [textBinaryVar]
      ),
      nextIndexVar
    ),
  ];
};
