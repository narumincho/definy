import * as c from "./codec";
import * as int32 from "./int32";
import * as util from "../util";
import { jsTs } from "../../deno-lib/npm";

export const name = jsTs.identifierFromString("Dict");

export const type = (
  key: jsTs.data.TsType,
  value: jsTs.data.TsType
): jsTs.data.TsType => jsTs.readonlyMapType(key, value);

export const encodeDefinitionStatementList = (
  keyTypeParameterName: string,
  valueTypeParameterName: string,
  valueVar: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const resultName = jsTs.identifierFromString("result");
  const elementName = jsTs.identifierFromString("element");
  const keyCodec = jsTs.variable(c.codecParameterName(keyTypeParameterName));
  const valueCodec = jsTs.variable(
    c.codecParameterName(valueTypeParameterName)
  );
  return [
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: false,
        name: resultName,
        type: jsTs.arrayType({ _: "Number" }),
        expr: jsTs.typeAssertion({
          expr: int32.encode(jsTs.get(valueVar, "size")),
          type: jsTs.arrayType({ _: "Number" }),
        }),
      },
    },
    jsTs.statementForOf({
      elementVariableName: elementName,
      iterableExpr: valueVar,
      statementList: [
        jsTs.statementSet({
          target: jsTs.variable(resultName),
          operatorMaybe: undefined,
          expr: jsTs.arrayLiteral([
            {
              expr: jsTs.variable(resultName),
              spread: true,
            },
            {
              expr: util.callEncode(keyCodec, {
                _: "Get",
                getExpr: {
                  expr: jsTs.variable(elementName),
                  propertyExpr: jsTs.numberLiteral(0),
                },
              }),
              spread: true,
            },
            {
              expr: util.callEncode(valueCodec, {
                _: "Get",
                getExpr: {
                  expr: jsTs.variable(elementName),
                  propertyExpr: jsTs.numberLiteral(1),
                },
              }),
              spread: true,
            },
          ]),
        }),
      ],
    }),
    jsTs.statementReturn(jsTs.variable(resultName)),
  ];
};

export const decodeDefinitionStatementList = (
  keyTypeParameterName: string,
  valueTypeParameterName: string,
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const keyTypeVar = jsTs.typeScopeInFileNoArguments(
    jsTs.identifierFromString(keyTypeParameterName)
  );
  const valueTypeVar = jsTs.typeScopeInFileNoArguments(
    jsTs.identifierFromString(valueTypeParameterName)
  );
  const resultName = jsTs.identifierFromString("result");
  const resultVar = jsTs.variable(resultName);
  const lengthResultName = jsTs.identifierFromString("lengthResult");
  const lengthResultVar = jsTs.variable(lengthResultName);
  const keyResultName = jsTs.identifierFromString("keyResult");
  const keyResultVar = jsTs.variable(keyResultName);
  const valueResultName = jsTs.identifierFromString("valueResult");
  const valueResultVar = jsTs.variable(valueResultName);
  const nextIndexName = jsTs.identifierFromString("nextIndex");
  const nextIndexVar = jsTs.variable(nextIndexName);

  return [
    jsTs.statementVariableDefinition({
      isConst: true,
      name: lengthResultName,
      type: c.decodeReturnType({ _: "Number" }),
      expr: int32.decode(parameterIndex, parameterBinary),
    }),
    jsTs.statementVariableDefinition({
      isConst: false,
      name: nextIndexName,
      type: { _: "Number" },
      expr: c.getNextIndex(lengthResultVar),
    }),
    jsTs.statementVariableDefinition({
      isConst: true,
      name: resultName,
      type: jsTs.mapType(keyTypeVar, valueTypeVar),
      expr: jsTs.newMap(jsTs.arrayLiteral([])),
    }),
    jsTs.statementFor({
      counterVariableName: jsTs.identifierFromString("i"),
      untilExpr: c.getResult(lengthResultVar),
      statementList: [
        jsTs.statementVariableDefinition({
          isConst: true,
          name: keyResultName,
          type: c.decodeReturnType(keyTypeVar),
          expr: util.callDecode(
            jsTs.variable(c.codecParameterName(keyTypeParameterName)),
            nextIndexVar,
            parameterBinary
          ),
        }),
        jsTs.statementVariableDefinition({
          isConst: true,
          name: valueResultName,
          type: c.decodeReturnType(valueTypeVar),
          expr: util.callDecode(
            jsTs.variable(c.codecParameterName(valueTypeParameterName)),
            c.getNextIndex(keyResultVar),
            parameterBinary
          ),
        }),
        jsTs.statementEvaluateExpr(
          jsTs.callMethod(resultVar, "set", [
            c.getResult(keyResultVar),
            c.getResult(valueResultVar),
          ])
        ),
        {
          _: "Set",
          setStatement: {
            target: nextIndexVar,
            operatorMaybe: undefined,
            expr: c.getNextIndex(valueResultVar),
          },
        },
      ],
    }),
    c.returnStatement(resultVar, nextIndexVar),
  ];
};
