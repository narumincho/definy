import * as c from "./codec";
import * as d from "../../localData";
import * as int32 from "./int32";
import { jsTs } from "../../gen/main";

export const encodeDefinitionStatementList = (
  valueVar: d.TsExpr
): ReadonlyArray<d.Statement> => [
  d.Statement.Return(
    jsTs.callMethod(int32.encode(jsTs.get(valueVar, "length")), "concat", [
      d.TsExpr.ArrayLiteral([{ expr: valueVar, spread: true }]),
    ])
  ),
];

export const decodeDefinitionStatementList = (
  parameterIndex: d.TsExpr,
  parameterBinary: d.TsExpr
): ReadonlyArray<d.Statement> => {
  const lengthName = jsTs.identifierFromString("length");
  const lengthVar = d.TsExpr.Variable(lengthName);
  const nextIndexName = jsTs.identifierFromString("nextIndex");
  const nextIndexVar = d.TsExpr.Variable(nextIndexName);

  return [
    d.Statement.VariableDefinition({
      isConst: true,
      name: lengthName,
      type: c.decodeReturnType(d.TsType.Number),
      expr: int32.decode(parameterIndex, parameterBinary),
    }),
    d.Statement.VariableDefinition({
      isConst: true,
      name: nextIndexName,
      type: d.TsType.Number,
      expr: jsTs.addition(c.getNextIndex(lengthVar), c.getResult(lengthVar)),
    }),
    c.returnStatement(
      jsTs.callMethod(parameterBinary, "slice", [
        c.getNextIndex(lengthVar),
        nextIndexVar,
      ]),
      nextIndexVar
    ),
  ];
};
