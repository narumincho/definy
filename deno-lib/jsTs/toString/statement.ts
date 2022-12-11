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
import { Context } from "./context.ts";

export const statementListToString = (
  statementList: ReadonlyArray<d.Statement>,
  indent: number,
  context: Context,
): string =>
  "{\n" +
  statementList
    .map((statement) =>
      statementToTypeScriptCodeAsString(
        statement,
        indent + 1,
        context,
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
  context: Context,
): string => {
  const indentString = indentNumberToString(indent);
  switch (statement._) {
    case "EvaluateExpr":
      return (
        indentString +
        exprToString(statement.tsExpr, indent, context) +
        ";"
      );

    case "Set":
      return (
        indentString +
        exprToString(
          statement.setStatement.target,
          indent,
          context,
        ) +
        " " +
        (statement.setStatement.operatorMaybe !== undefined
          ? binaryOperatorToString(statement.setStatement.operatorMaybe)
          : "") +
        "= " +
        exprToString(statement.setStatement.expr, indent, context) +
        ";"
      );

    case "If":
      return (
        indentString +
        "if (" +
        exprToString(
          statement.ifStatement.condition,
          indent,
          context,
        ) +
        ") " +
        statementListToString(
          statement.ifStatement.thenStatementList,
          indent,
          context,
        )
      );

    case "ThrowError":
      return (
        indentString +
        "throw new Error(" +
        exprToString(statement.tsExpr, indent, context) +
        ");"
      );

    case "Return":
      return (
        indentString +
        "return " +
        exprToString(statement.tsExpr, indent, context) +
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
          context,
        ) +
        " = " +
        exprToString(
          statement.variableDefinitionStatement.expr,
          indent,
          context,
        ) +
        ";"
      );

    case "FunctionDefinition":
      return functionDefinitionStatementToString(
        statement.functionDefinitionStatement,
        indent,
        context,
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
          context,
        ) +
        "; " +
        statement.forStatement.counterVariableName +
        " += 1)" +
        statementListToString(
          statement.forStatement.statementList,
          indent,
          context,
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
          context,
        ) +
        ")" +
        statementListToString(
          statement.forOfStatement.statementList,
          indent,
          context,
        )
      );

    case "WhileTrue":
      return (
        indentString +
        "while (true) " +
        statementListToString(
          statement.statementList,
          indent,
          context,
        )
      );

    case "Break":
      return indentString + "break;";

    case "Switch":
      return switchToString(
        statement.switchStatement,
        indent,
        context,
      );
  }
};

const functionDefinitionStatementToString = (
  functionDefinition: d.FunctionDefinitionStatement,
  indent: number,
  context: Context,
): string =>
  indentNumberToString(indent) +
  "const " +
  functionDefinition.name +
  " = " +
  typeParameterListToString(functionDefinition.typeParameterList) +
  "(" +
  functionDefinition.parameterList
    .map(
      (parameter) => parameter.name + typeAnnotation(parameter.type, context),
    )
    .join(", ") +
  ")" +
  typeAnnotation(functionDefinition.returnType, context) +
  " => " +
  lambdaBodyToString(
    functionDefinition.statementList,
    indent,
    context,
  ) +
  ";";

const switchToString = (
  switch_: d.SwitchStatement,
  indent: number,
  context: Context,
): string => {
  const indentString = indentNumberToString(indent);
  const caseIndentNumber = indent + 1;
  const caseIndentString = indentNumberToString(caseIndentNumber);
  return (
    indentString +
    "switch (" +
    exprToString(switch_.expr, indent, context) +
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
            context,
          ),
      )
      .join("\n") +
    "\n" +
    indentString +
    "}"
  );
};
