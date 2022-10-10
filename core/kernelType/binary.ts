import * as c from "./codec";
import * as int32 from "./int32";
import { jsTs } from "../../deno-lib/npm";

export const encodeDefinitionStatementList = (
  valueVar: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => [
  {
    _: "Return",
    tsExpr: jsTs.callMethod(
      int32.encode(jsTs.get(valueVar, "length")),
      "concat",
      [{ _: "ArrayLiteral", arrayItemList: [{ expr: valueVar, spread: true }] }]
    ),
  },
];

export const decodeDefinitionStatementList = (
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const lengthName = jsTs.identifierFromString("length");
  const lengthVar = jsTs.variable(lengthName);
  const nextIndexName = jsTs.identifierFromString("nextIndex");
  const nextIndexVar = jsTs.variable(nextIndexName);

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
    c.returnStatement(
      jsTs.callMethod(parameterBinary, "slice", [
        c.getNextIndex(lengthVar),
        nextIndexVar,
      ]),
      nextIndexVar
    ),
  ];
};
