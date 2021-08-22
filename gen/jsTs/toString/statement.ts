import * as d from "../../../localData";
import {
  binaryOperatorToString,
  exprToString,
  lambdaBodyToString,
} from "./expr";
import {
  indentNumberToString,
  stringLiteralValueToString,
  typeParameterListToString,
} from "./common";
import { typeAnnotation } from "./type";

export const statementListToString = (
  statementList: ReadonlyArray<d.Statement>,
  indent: number,
  moduleMap: ReadonlyMap<string, d.TsIdentifer>,
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
  moduleMap: ReadonlyMap<string, d.TsIdentifer>,
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
        (statement.setStatement.operatorMaybe._ === "Just"
          ? binaryOperatorToString(statement.setStatement.operatorMaybe.value)
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
        statement.variableDefinitionStatement.name.string +
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
        statement.forStatement.counterVariableName.string +
        " = 0; " +
        statement.forStatement.counterVariableName.string +
        " < " +
        exprToString(
          statement.forStatement.untilExpr,
          indent,
          moduleMap,
          codeType
        ) +
        "; " +
        statement.forStatement.counterVariableName.string +
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
        statement.forOfStatement.elementVariableName.string +
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
  moduleMap: ReadonlyMap<string, d.TsIdentifer>,
  codeType: d.CodeType
): string =>
  indentNumberToString(indent) +
  "const " +
  functionDefinition.name.string +
  " = " +
  typeParameterListToString(functionDefinition.typeParameterList) +
  "(" +
  functionDefinition.parameterList
    .map(
      (parameter) =>
        parameter.name.string +
        typeAnnotation(parameter.type, codeType, moduleMap)
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
  moduleMap: ReadonlyMap<string, d.TsIdentifer>,
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
