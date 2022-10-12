import * as d from "../data.ts";
import {
  binaryOperatorToString,
  exprToString,
  lambdaBodyToString,
} from "./expr.ts";
import {
  indentNumberToString,
  stringLiteralValueToString,
  typeParameterListToString,
} from "./common.ts";
import { typeAnnotation } from "./type.ts";
import { TsIdentifier } from "../identifier.ts";

export const statementListToString = (
  statementList: ReadonlyArray<d.Statement>,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
): string =>
  "{\n" +
  statementList
    .map((statement) =>
      statementToTypeScriptCodeAsString(
        statement,
        indent + 1,
        moduleMap,
        codeType
      )
    )
    .join("\n") +
  "\n" +
  indentNumberToString(indent) +
  "}";

/**
 * 文をTypeScriptのコードに変換する
 * @param statement 文
 */
const statementToTypeScriptCodeAsString = (
  statement: d.Statement,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
): string => {
  const indentString = indentNumberToString(indent);
  switch (statement._) {
    case "EvaluateExpr":
      return (
        indentString +
        exprToString(statement.tsExpr, indent, moduleMap, codeType) +
        ";"
      );

    case "Set":
      return (
        indentString +
        exprToString(
          statement.setStatement.target,
          indent,
          moduleMap,
          codeType
        ) +
        " " +
        (statement.setStatement.operatorMaybe !== undefined
          ? binaryOperatorToString(statement.setStatement.operatorMaybe)
          : "") +
        "= " +
        exprToString(statement.setStatement.expr, indent, moduleMap, codeType) +
        ";"
      );

    case "If":
      return (
        indentString +
        "if (" +
        exprToString(
          statement.ifStatement.condition,
          indent,
          moduleMap,
          codeType
        ) +
        ") " +
        statementListToString(
          statement.ifStatement.thenStatementList,
          indent,
          moduleMap,
          codeType
        )
      );

    case "ThrowError":
      return (
        indentString +
        "throw new Error(" +
        exprToString(statement.tsExpr, indent, moduleMap, codeType) +
        ");"
      );

    case "Return":
      return (
        indentString +
        "return " +
        exprToString(statement.tsExpr, indent, moduleMap, codeType) +
        ";"
      );

    case "ReturnVoid":
      return indentString + "return;";

    case "Continue":
      return indentString + "continue;";

    case "VariableDefinition":
      return (
        indentString +
        (statement.variableDefinitionStatement.isConst ? "const" : "let") +
        " " +
        statement.variableDefinitionStatement.name +
        typeAnnotation(
          statement.variableDefinitionStatement.type,
          codeType,
          moduleMap
        ) +
        " = " +
        exprToString(
          statement.variableDefinitionStatement.expr,
          indent,
          moduleMap,
          codeType
        ) +
        ";"
      );

    case "FunctionDefinition":
      return functionDefinitionStatementToString(
        statement.functionDefinitionStatement,
        indent,
        moduleMap,
        codeType
      );

    case "For":
      return (
        indentString +
        "for (let " +
        statement.forStatement.counterVariableName +
        " = 0; " +
        statement.forStatement.counterVariableName +
        " < " +
        exprToString(
          statement.forStatement.untilExpr,
          indent,
          moduleMap,
          codeType
        ) +
        "; " +
        statement.forStatement.counterVariableName +
        " += 1)" +
        statementListToString(
          statement.forStatement.statementList,
          indent,
          moduleMap,
          codeType
        )
      );

    case "ForOf":
      return (
        indentString +
        "for (const " +
        statement.forOfStatement.elementVariableName +
        " of " +
        exprToString(
          statement.forOfStatement.iterableExpr,
          indent,
          moduleMap,
          codeType
        ) +
        ")" +
        statementListToString(
          statement.forOfStatement.statementList,
          indent,
          moduleMap,
          codeType
        )
      );

    case "WhileTrue":
      return (
        indentString +
        "while (true) " +
        statementListToString(
          statement.statementList,
          indent,
          moduleMap,
          codeType
        )
      );

    case "Break":
      return indentString + "break;";

    case "Switch":
      return switchToString(
        statement.switchStatement,
        indent,
        moduleMap,
        codeType
      );
  }
};

const functionDefinitionStatementToString = (
  functionDefinition: d.FunctionDefinitionStatement,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
): string =>
  indentNumberToString(indent) +
  "const " +
  functionDefinition.name +
  " = " +
  typeParameterListToString(functionDefinition.typeParameterList) +
  "(" +
  functionDefinition.parameterList
    .map(
      (parameter) =>
        parameter.name + typeAnnotation(parameter.type, codeType, moduleMap)
    )
    .join(", ") +
  ")" +
  typeAnnotation(functionDefinition.returnType, codeType, moduleMap) +
  " => " +
  lambdaBodyToString(
    functionDefinition.statementList,
    indent,
    moduleMap,
    codeType
  ) +
  ";";

const switchToString = (
  switch_: d.SwitchStatement,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
): string => {
  const indentString = indentNumberToString(indent);
  const caseIndentNumber = indent + 1;
  const caseIndentString = indentNumberToString(caseIndentNumber);
  return (
    indentString +
    "switch (" +
    exprToString(switch_.expr, indent, moduleMap, codeType) +
    ") {\n" +
    switch_.patternList
      .map(
        (pattern) =>
          caseIndentString +
          "case " +
          stringLiteralValueToString(pattern.caseString) +
          ": " +
          statementListToString(
            pattern.statementList,
            caseIndentNumber,
            moduleMap,
            codeType
          )
      )
      .join("\n") +
    "\n" +
    indentString +
    "}"
  );
};
