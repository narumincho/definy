import * as c from "./codec";
import * as d from "../../data";
import * as int32 from "./int32";
import { identifer, util as tsUtil } from "../../gen/jsTs/main";

export const encodeDefinitionStatementList = (
  valueVar: d.TsExpr
): ReadonlyArray<d.Statement> => [
  d.Statement.Return(
    tsUtil.callMethod(int32.encode(tsUtil.get(valueVar, "length")), "concat", [
      d.TsExpr.ArrayLiteral([{ expr: valueVar, spread: true }]),
    ])
  ),
];

export const decodeDefinitionStatementList = (
  parameterIndex: d.TsExpr,
  parameterBinary: d.TsExpr
): ReadonlyArray<d.Statement> => {
  const lengthName = identifer.fromString("length");
  const lengthVar = d.TsExpr.Variable(lengthName);
  const nextIndexName = identifer.fromString("nextIndex");
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
