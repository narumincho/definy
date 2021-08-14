import * as c from "./codec";
import * as int32 from "./int32";
import * as ts from "../../localData";
import * as util from "../util";
import { jsTs } from "../../gen/main";

const name = jsTs.identiferFromString("String");

export const type = ts.TsType.String;

export const codec = (): ts.TsExpr =>
  jsTs.get(ts.TsExpr.Variable(name), util.codecPropertyName);

export const encodeDefinitionStatementList = (
  valueVar: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const resultName = jsTs.identiferFromString("result");
  const resultVar = ts.TsExpr.Variable(resultName);

  return [
    ts.Statement.VariableDefinition({
      isConst: true,
      name: resultName,
      type: jsTs.readonlyArrayType(ts.TsType.Number),
      expr: ts.TsExpr.ArrayLiteral([
        {
          expr: jsTs.callMethod(
            ts.TsExpr.New({
              expr: ts.TsExpr.GlobalObjects(
                jsTs.identiferFromString("TextEncoder")
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
      jsTs.callMethod(int32.encode(jsTs.get(resultVar, "length")), "concat", [
        resultVar,
      ])
    ),
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: ts.TsExpr,
  parameterBinary: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const lengthName = jsTs.identiferFromString("length");
  const lengthVar = ts.TsExpr.Variable(lengthName);
  const nextIndexName = jsTs.identiferFromString("nextIndex");
  const nextIndexVar = ts.TsExpr.Variable(nextIndexName);
  const textBinaryName = jsTs.identiferFromString("textBinary");
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
      expr: jsTs.addition(c.getNextIndex(lengthVar), c.getResult(lengthVar)),
    }),
    ts.Statement.VariableDefinition({
      isConst: true,
      name: textBinaryName,
      type: jsTs.uint8ArrayType,
      expr: jsTs.callMethod(parameterBinary, "slice", [
        c.getNextIndex(lengthVar),
        nextIndexVar,
      ]),
    }),
    c.returnStatement(
      jsTs.callMethod(
        ts.TsExpr.New({
          expr: ts.TsExpr.GlobalObjects(
            jsTs.identiferFromString("TextDecoder")
          ),
          parameterList: [],
        }),
        "decode",
        [textBinaryVar]
      ),
      nextIndexVar
    ),
  ];
};
