import * as c from "./codec";
import * as int32 from "./int32";
import * as util from "../util";
import { d, jsTs } from "../../gen/main";

export const name = jsTs.identiferFromString("List");

export const type = (element: d.TsType): d.TsType =>
  jsTs.readonlyArrayType(element);

export const encodeDefinitionStatementList = (
  typeParameterName: string,
  valueVar: d.TsExpr
): ReadonlyArray<d.Statement> => {
  const resultName = jsTs.identiferFromString("result");
  const elementName = jsTs.identiferFromString("element");
  return [
    d.Statement.VariableDefinition({
      isConst: false,
      name: resultName,
      type: jsTs.arrayType(d.TsType.Number),
      expr: d.TsExpr.TypeAssertion({
        expr: int32.encode(jsTs.get(valueVar, "length")),
        type: jsTs.arrayType(d.TsType.Number),
      }),
    }),
    d.Statement.ForOf({
      elementVariableName: elementName,
      iterableExpr: valueVar,
      statementList: [
        d.Statement.Set({
          target: d.TsExpr.Variable(resultName),
          operatorMaybe: d.Maybe.Nothing(),
          expr: jsTs.callMethod(d.TsExpr.Variable(resultName), "concat", [
            util.callEncode(
              d.TsExpr.Variable(c.codecParameterName(typeParameterName)),
              d.TsExpr.Variable(elementName)
            ),
          ]),
        }),
      ],
    }),
    d.Statement.Return(d.TsExpr.Variable(resultName)),
  ];
};

export const decodeDefinitionStatementList = (
  typeParameterName: string,
  parameterIndex: d.TsExpr,
  parameterBinary: d.TsExpr
): ReadonlyArray<d.Statement> => {
  const elementTypeVar = d.TsType.ScopeInFile(
    jsTs.identiferFromString(typeParameterName)
  );
  const resultName = jsTs.identiferFromString("result");
  const resultVar = d.TsExpr.Variable(resultName);
  const lengthResultName = jsTs.identiferFromString("lengthResult");
  const lengthResultVar = d.TsExpr.Variable(lengthResultName);
  const resultAndNextIndexName = jsTs.identiferFromString("resultAndNextIndex");
  const resultAndNextIndexVar = d.TsExpr.Variable(resultAndNextIndexName);
  const nextIndexName = jsTs.identiferFromString("nextIndex");
  const nextIndexVar = d.TsExpr.Variable(nextIndexName);

  return [
    d.Statement.VariableDefinition({
      isConst: true,
      name: lengthResultName,
      type: c.decodeReturnType(d.TsType.Number),
      expr: int32.decode(parameterIndex, parameterBinary),
    }),
    d.Statement.VariableDefinition({
      isConst: false,
      name: nextIndexName,
      type: d.TsType.Number,
      expr: c.getNextIndex(lengthResultVar),
    }),
    d.Statement.VariableDefinition({
      isConst: true,
      name: resultName,
      type: jsTs.arrayType(elementTypeVar),
      expr: d.TsExpr.ArrayLiteral([]),
    }),
    d.Statement.For({
      counterVariableName: jsTs.identiferFromString("i"),
      untilExpr: c.getResult(lengthResultVar),
      statementList: [
        d.Statement.VariableDefinition({
          isConst: true,
          name: resultAndNextIndexName,
          type: c.decodeReturnType(elementTypeVar),
          expr: util.callDecode(
            d.TsExpr.Variable(c.codecParameterName(typeParameterName)),
            nextIndexVar,
            parameterBinary
          ),
        }),
        d.Statement.EvaluateExpr(
          jsTs.callMethod(resultVar, "push", [
            c.getResult(resultAndNextIndexVar),
          ])
        ),
        d.Statement.Set({
          target: nextIndexVar,
          operatorMaybe: d.Maybe.Nothing(),
          expr: c.getNextIndex(resultAndNextIndexVar),
        }),
      ],
    }),
    c.returnStatement(resultVar, nextIndexVar),
  ];
};
