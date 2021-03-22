import * as c from "./codec";
import * as identifer from "../../gen/jsTs/identifer";
import * as int32 from "./int32";
import * as ts from "../../data";
import * as tsUtil from "../../gen/jsTs/util";
import * as util from "../util";

export const name = identifer.fromString("Dict");

export const type = (key: ts.TsType, value: ts.TsType): ts.TsType =>
  tsUtil.readonlyMapType(key, value);

export const encodeDefinitionStatementList = (
  keyTypeParameterName: string,
  valueTypeParameterName: string,
  valueVar: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const resultName = identifer.fromString("result");
  const elementName = identifer.fromString("element");
  const keyCodec = ts.TsExpr.Variable(
    c.codecParameterName(keyTypeParameterName)
  );
  const valueCodec = ts.TsExpr.Variable(
    c.codecParameterName(valueTypeParameterName)
  );
  return [
    ts.Statement.VariableDefinition({
      isConst: false,
      name: resultName,
      type: tsUtil.arrayType(ts.TsType.Number),
      expr: ts.TsExpr.TypeAssertion({
        expr: int32.encode(tsUtil.get(valueVar, "size")),
        type: tsUtil.arrayType(ts.TsType.Number),
      }),
    }),
    ts.Statement.ForOf({
      elementVariableName: elementName,
      iterableExpr: valueVar,
      statementList: [
        ts.Statement.Set({
          target: ts.TsExpr.Variable(resultName),
          operatorMaybe: ts.Maybe.Nothing(),
          expr: ts.TsExpr.ArrayLiteral([
            {
              expr: ts.TsExpr.Variable(resultName),
              spread: true,
            },
            {
              expr: util.callEncode(
                keyCodec,
                ts.TsExpr.Get({
                  expr: ts.TsExpr.Variable(elementName),
                  propertyExpr: ts.TsExpr.NumberLiteral(0),
                })
              ),
              spread: true,
            },
            {
              expr: util.callEncode(
                valueCodec,
                ts.TsExpr.Get({
                  expr: ts.TsExpr.Variable(elementName),
                  propertyExpr: ts.TsExpr.NumberLiteral(1),
                })
              ),
              spread: true,
            },
          ]),
        }),
      ],
    }),
    ts.Statement.Return(ts.TsExpr.Variable(resultName)),
  ];
};

export const decodeDefinitionStatementList = (
  keyTypeParameterName: string,
  valueTypeParameterName: string,
  parameterIndex: ts.TsExpr,
  parameterBinary: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const keyTypeVar = ts.TsType.ScopeInFile(
    identifer.fromString(keyTypeParameterName)
  );
  const valueTypeVar = ts.TsType.ScopeInFile(
    identifer.fromString(valueTypeParameterName)
  );
  const resultName = identifer.fromString("result");
  const resultVar = ts.TsExpr.Variable(resultName);
  const lengthResultName = identifer.fromString("lengthResult");
  const lengthResultVar = ts.TsExpr.Variable(lengthResultName);
  const keyResultName = identifer.fromString("keyResult");
  const keyResultVar = ts.TsExpr.Variable(keyResultName);
  const valueResultName = identifer.fromString("valueResult");
  const valueResultVar = ts.TsExpr.Variable(valueResultName);
  const nextIndexName = identifer.fromString("nextIndex");
  const nextIndexVar = ts.TsExpr.Variable(nextIndexName);

  return [
    ts.Statement.VariableDefinition({
      isConst: true,
      name: lengthResultName,
      type: c.decodeReturnType(ts.TsType.Number),
      expr: int32.decode(parameterIndex, parameterBinary),
    }),
    ts.Statement.VariableDefinition({
      isConst: false,
      name: nextIndexName,
      type: ts.TsType.Number,
      expr: c.getNextIndex(lengthResultVar),
    }),
    ts.Statement.VariableDefinition({
      isConst: true,
      name: resultName,
      type: tsUtil.mapType(keyTypeVar, valueTypeVar),
      expr: tsUtil.newMap(ts.TsExpr.ArrayLiteral([])),
    }),
    ts.Statement.For({
      counterVariableName: identifer.fromString("i"),
      untilExpr: c.getResult(lengthResultVar),
      statementList: [
        ts.Statement.VariableDefinition({
          isConst: true,
          name: keyResultName,
          type: c.decodeReturnType(keyTypeVar),
          expr: util.callDecode(
            ts.TsExpr.Variable(c.codecParameterName(keyTypeParameterName)),
            nextIndexVar,
            parameterBinary
          ),
        }),
        ts.Statement.VariableDefinition({
          isConst: true,
          name: valueResultName,
          type: c.decodeReturnType(valueTypeVar),
          expr: util.callDecode(
            ts.TsExpr.Variable(c.codecParameterName(valueTypeParameterName)),
            c.getNextIndex(keyResultVar),
            parameterBinary
          ),
        }),
        ts.Statement.EvaluateExpr(
          tsUtil.callMethod(resultVar, "set", [
            c.getResult(keyResultVar),
            c.getResult(valueResultVar),
          ])
        ),
        ts.Statement.Set({
          target: nextIndexVar,
          operatorMaybe: ts.Maybe.Nothing(),
          expr: c.getNextIndex(valueResultVar),
        }),
      ],
    }),
    c.returnStatement(resultVar, nextIndexVar),
  ];
};
