import * as c from "./codec";
import * as int32 from "./int32";
import * as util from "../util";
import { jsTs } from "../../deno-lib/npm";

export const name = jsTs.identifierFromString("List");

export const type = (element: jsTs.data.TsType): jsTs.data.TsType =>
  jsTs.readonlyArrayType(element);

export const encodeDefinitionStatementList = (
  typeParameterName: string,
  valueVar: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const resultName = jsTs.identifierFromString("result");
  const elementName = jsTs.identifierFromString("element");
  return [
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: false,
        name: resultName,
        type: jsTs.arrayType({ _: "Number" }),
        expr: {
          _: "TypeAssertion",
          typeAssertion: {
            expr: int32.encode(jsTs.get(valueVar, "length")),
            type: jsTs.arrayType({ _: "Number" }),
          },
        },
      },
    },
    {
      _: "ForOf",
      forOfStatement: {
        elementVariableName: elementName,
        iterableExpr: valueVar,
        statementList: [
          {
            _: "Set",
            setStatement: {
              target: jsTs.variable(resultName),
              operatorMaybe: undefined,
              expr: jsTs.callMethod(jsTs.variable(resultName), "concat", [
                util.callEncode(
                  jsTs.variable(c.codecParameterName(typeParameterName)),
                  jsTs.variable(elementName)
                ),
              ]),
            },
          },
        ],
      },
    },
    jsTs.statementReturn(jsTs.variable(resultName)),
  ];
};

export const decodeDefinitionStatementList = (
  typeParameterName: string,
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const elementTypeVar = jsTs.typeScopeInFileNoArguments(
    jsTs.identifierFromString(typeParameterName)
  );
  const resultName = jsTs.identifierFromString("result");
  const resultVar = jsTs.variable(resultName);
  const lengthResultName = jsTs.identifierFromString("lengthResult");
  const lengthResultVar = jsTs.variable(lengthResultName);
  const resultAndNextIndexName =
    jsTs.identifierFromString("resultAndNextIndex");
  const resultAndNextIndexVar = jsTs.variable(resultAndNextIndexName);
  const nextIndexName = jsTs.identifierFromString("nextIndex");
  const nextIndexVar = jsTs.variable(nextIndexName);

  return [
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: true,
        name: lengthResultName,
        type: c.decodeReturnType({ _: "Number" }),
        expr: int32.decode(parameterIndex, parameterBinary),
      },
    },
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: false,
        name: nextIndexName,
        type: { _: "Number" },
        expr: c.getNextIndex(lengthResultVar),
      },
    },
    {
      _: "VariableDefinition",
      variableDefinitionStatement: {
        isConst: true,
        name: resultName,
        type: jsTs.arrayType(elementTypeVar),
        expr: { _: "ArrayLiteral", arrayItemList: [] },
      },
    },
    {
      _: "For",
      forStatement: {
        counterVariableName: jsTs.identifierFromString("i"),
        untilExpr: c.getResult(lengthResultVar),
        statementList: [
          {
            _: "VariableDefinition",
            variableDefinitionStatement: {
              isConst: true,
              name: resultAndNextIndexName,
              type: c.decodeReturnType(elementTypeVar),
              expr: util.callDecode(
                jsTs.variable(c.codecParameterName(typeParameterName)),
                nextIndexVar,
                parameterBinary
              ),
            },
          },
          jsTs.statementEvaluateExpr(
            jsTs.callMethod(resultVar, "push", [
              c.getResult(resultAndNextIndexVar),
            ])
          ),
          {
            _: "Set",
            setStatement: {
              target: nextIndexVar,
              operatorMaybe: undefined,
              expr: c.getNextIndex(resultAndNextIndexVar),
            },
          },
        ],
      },
    },
    c.returnStatement(resultVar, nextIndexVar),
  ];
};
