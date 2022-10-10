import * as c from "./codec";
import * as int32 from "./int32";
import * as util from "../util";
import { jsTs } from "../../deno-lib/npm";

const name = jsTs.identifierFromString("String");

export const type: jsTs.data.TsType = { _: "String" };

export const codec = (): jsTs.data.TsExpr =>
  jsTs.get(jsTs.variable(name), util.codecPropertyName);

export const encodeDefinitionStatementList = (
  valueVar: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const resultName = jsTs.identifierFromString("result");
  const resultVar = jsTs.variable(resultName);

  return [
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: true,
        name: resultName,
        type: jsTs.readonlyArrayType({ _: "Number" }),
        expr: {
          _: "ArrayLiteral",
          arrayItemList: [
            {
              expr: jsTs.callMethod(jsTs.newTextEncoder, "encode", [valueVar]),
              spread: true,
            },
          ],
        },
      },
    },
    jsTs.statementReturn(
      jsTs.callMethod(int32.encode(jsTs.get(resultVar, "length")), "concat", [
        resultVar,
      ])
    ),
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const lengthName = jsTs.identifierFromString("length");
  const lengthVar = jsTs.variable(lengthName);
  const nextIndexName = jsTs.identifierFromString("nextIndex");
  const nextIndexVar = jsTs.variable(nextIndexName);
  const textBinaryName = jsTs.identifierFromString("textBinary");
  const textBinaryVar = jsTs.variable(textBinaryName);

  return [
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: true,
        name: lengthName,
        type: c.decodeReturnType({ _: "Number" }),
        expr: int32.decode(parameterIndex, parameterBinary),
      },
    },
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: true,
        name: nextIndexName,
        type: { _: "Number" },
        expr: jsTs.addition(c.getNextIndex(lengthVar), c.getResult(lengthVar)),
      },
    },
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: true,
        name: textBinaryName,
        type: jsTs.uint8ArrayType,
        expr: jsTs.callMethod(parameterBinary, "slice", [
          c.getNextIndex(lengthVar),
          nextIndexVar,
        ]),
      },
    },
    c.returnStatement(
      jsTs.callMethod(jsTs.newTextDecoder, "decode", [textBinaryVar]),
      nextIndexVar
    ),
  ];
};
