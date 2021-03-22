import * as c from "./codec";
import * as int32 from "./int32";
import * as ts from "../../data";
import * as util from "../util";
import { identifer, util as tsUtil } from "../../gen/jsTs/main";

const name = identifer.fromString("String");

export const type = ts.TsType.String;

export const codec = (): ts.TsExpr =>
  tsUtil.get(ts.TsExpr.Variable(name), util.codecPropertyName);

export const encodeDefinitionStatementList = (
  valueVar: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const resultName = identifer.fromString("result");
  const resultVar = ts.TsExpr.Variable(resultName);

  return [
    ts.Statement.VariableDefinition({
      isConst: true,
      name: resultName,
      type: tsUtil.readonlyArrayType(ts.TsType.Number),
      expr: ts.TsExpr.ArrayLiteral([
        {
          expr: tsUtil.callMethod(
            ts.TsExpr.New({
              expr: ts.TsExpr.GlobalObjects(
                identifer.fromString("TextEncoder")
              ),
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
  parameterIndex: ts.TsExpr,
  parameterBinary: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const lengthName = identifer.fromString("length");
  const lengthVar = ts.TsExpr.Variable(lengthName);
  const nextIndexName = identifer.fromString("nextIndex");
  const nextIndexVar = ts.TsExpr.Variable(nextIndexName);
  const textBinaryName = identifer.fromString("textBinary");
  const textBinaryVar = ts.TsExpr.Variable(textBinaryName);

  return [
    ts.Statement.VariableDefinition({
      isConst: true,
      name: lengthName,
      type: c.decodeReturnType(ts.TsType.Number),
      expr: int32.decode(parameterIndex, parameterBinary),
    }),
    ts.Statement.VariableDefinition({
      isConst: true,
      name: nextIndexName,
      type: ts.TsType.Number,
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
        ts.TsExpr.New({
          expr: ts.TsExpr.GlobalObjects(identifer.fromString("TextDecoder")),
          parameterList: [],
        }),
        "decode",
        [textBinaryVar]
      ),
      nextIndexVar
    ),
  ];
};
