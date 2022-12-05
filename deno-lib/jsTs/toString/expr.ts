import * as d from "../data.ts";
import {
  isIdentifier,
  isSafePropertyName,
  TsIdentifier,
} from "../identifier.ts";
import {
  stringLiteralValueToString,
  typeParameterListToString,
} from "./common.ts";
import { typeAnnotation, typeToString } from "./type.ts";
import { statementListToString } from "./statement.ts";
import { Context } from "./context.ts";

/**
 * 式をコードに変換する
 * @param expr 式
 */
export const exprToString = (
  expr: d.TsExpr,
  indent: number,
  context: Context,
): string => {
  switch (expr._) {
    case "NumberLiteral":
      return expr.int32.toString();

    case "StringLiteral":
      return stringLiteralValueToString(expr.string);

    case "BooleanLiteral":
      return expr.bool.toString();

    case "UndefinedLiteral":
      return "undefined";

    case "NullLiteral":
      return "null";

    case "ArrayLiteral":
      return arrayLiteralToString(
        expr.arrayItemList,
        indent,
        context,
      );

    case "ObjectLiteral":
      return objectLiteralToString(
        expr.tsMemberList,
        indent,
        context,
      );

    case "UnaryOperator":
      return (
        unaryOperatorToString(expr.unaryOperatorExpr.operator) +
        exprToStringWithCombineStrength(
          expr,
          expr.unaryOperatorExpr.expr,
          indent,
          context,
        )
      );
    case "BinaryOperator":
      return binaryOperatorExprToString(
        expr.binaryOperatorExpr,
        indent,
        context,
      );

    case "ConditionalOperator":
      return conditionalOperatorToString(
        expr.conditionalOperatorExpr,
        indent,
        context,
      );

    case "Lambda": {
      return (
        typeParameterListToString(expr.lambdaExpr.typeParameterList) +
        "(" +
        expr.lambdaExpr.parameterList
          .map(
            (parameter) =>
              parameter.name +
              typeAnnotation(parameter.type, context),
          )
          .join(", ") +
        ")" +
        typeAnnotation(expr.lambdaExpr.returnType, context) +
        " => " +
        lambdaBodyToString(
          expr.lambdaExpr.statementList,
          indent,
          context,
        )
      );
    }

    case "Variable":
      return expr.tsIdentifier;

    case "GlobalObjects": {
      if (context.usedNameSet.has(expr.tsIdentifier)) {
        return "globalThis." + expr.tsIdentifier;
      }
      return expr.tsIdentifier;
    }

    case "ImportedVariable": {
      const nameSpaceIdentifier = context.moduleMap.get(
        expr.importedVariable.moduleName,
      );
      if (nameSpaceIdentifier === undefined) {
        throw Error(
          "収集されなかった, モジュールがある moduleName=" +
            expr.importedVariable.moduleName,
        );
      }
      return nameSpaceIdentifier + "." + expr.importedVariable.name;
    }

    case "Get":
      return (
        exprToStringWithCombineStrength(
          expr,
          expr.getExpr.expr,
          indent,
          context,
        ) +
        indexAccessToString(
          expr.getExpr.propertyExpr,
          indent,
          context,
        )
      );

    case "Call":
      return callExprToString(expr, expr.callExpr, indent, context);

    case "New":
      return (
        "new " +
        callExprToString(expr, expr.callExpr, indent, context)
      );

    case "TypeAssertion":
      return (
        exprToString(expr.typeAssertion.expr, indent, context) +
        (context.codeType === "TypeScript"
          ? " as " + typeToString(expr.typeAssertion.type, context)
          : "")
      );
  }
};

const arrayLiteralToString = (
  itemList: ReadonlyArray<d.ArrayItem>,
  indent: number,
  context: Context,
): string =>
  "[" +
  itemList
    .map(
      (item) =>
        (item.spread ? "..." : "") +
        exprToString(item.expr, indent, context),
    )
    .join(", ") +
  "]";

const objectLiteralToString = (
  memberList: ReadonlyArray<d.TsMember>,
  indent: number,
  context: Context,
): string =>
  "{ " +
  memberList
    .map((member) => {
      switch (member._) {
        case "Spread":
          return (
            "..." + exprToString(member.tsExpr, indent, context)
          );
        case "KeyValue": {
          if (member.keyValue.key._ !== "StringLiteral") {
            return "[" + exprToString(
              member.keyValue.key,
              indent,
              context,
            ) +
              "]: " +
              exprToString(member.keyValue.value, indent, context);
          }
          const key = member.keyValue.key.string;
          if (
            isIdentifier(key) &&
            member.keyValue.value._ === "Variable" &&
            key === member.keyValue.value.tsIdentifier
          ) {
            return member.keyValue.key;
          }
          return (
            (isSafePropertyName(key) ? key : stringLiteralValueToString(key)) +
            ": " +
            exprToString(member.keyValue.value, indent, context)
          );
        }
      }
    })
    .join(", ") +
  " " +
  "}";

const unaryOperatorToString = (unaryOperator: d.UnaryOperator): string => {
  switch (unaryOperator) {
    case "Minus":
      return "-";
    case "BitwiseNot":
      return "~";
    case "LogicalNot":
      return "!";
    case "typeof":
      return "typeof ";
  }
};

const exprToStringWithCombineStrength = (
  expr: d.TsExpr,
  target: d.TsExpr,
  indent: number,
  context: Context,
): string => {
  const text = exprToString(target, indent, context);
  if (exprCombineStrength(expr) > exprCombineStrength(target)) {
    return "(" + text + ")";
  }
  return text;
};

const exprCombineStrength = (expr: d.TsExpr): number => {
  switch (expr._) {
    case "NumberLiteral":
    case "StringLiteral":
    case "BooleanLiteral":
    case "NullLiteral":
    case "UndefinedLiteral":
    case "ArrayLiteral":
    case "Variable":
    case "GlobalObjects":
    case "ImportedVariable":
      return 23;
    case "Lambda":
      return 22;
    case "ObjectLiteral":
      return 21;
    case "Get":
    case "Call":
    case "New":
      return 20;
    case "UnaryOperator":
      return 17;
    case "BinaryOperator":
      return binaryOperatorCombineStrength(expr.binaryOperatorExpr.operator);
    case "ConditionalOperator":
      return 4;
    case "TypeAssertion":
      return 3;
  }
};

const binaryOperatorCombineStrength = (
  binaryOperator: d.BinaryOperator,
): number => {
  switch (binaryOperator) {
    case "Exponentiation":
      return 16;
    case "Multiplication":
    case "Division":
    case "Remainder":
      return 15;
    case "Addition":
    case "Subtraction":
      return 14;
    case "LeftShift":
    case "SignedRightShift":
    case "UnsignedRightShift":
      return 13;
    case "LessThan":
    case "LessThanOrEqual":
      return 12;
    case "Equal":
    case "NotEqual":
      return 11;
    case "BitwiseAnd":
      return 10;
    case "BitwiseXOr":
      return 9;
    case "BitwiseOr":
      return 8;
    case "LogicalAnd":
      return 6;
    case "LogicalOr":
    case "??":
      return 5;
  }
};

const binaryOperatorExprToString = (
  binaryOperatorExpr: d.BinaryOperatorExpr,
  indent: number,
  context: Context,
): string => {
  const operatorExprCombineStrength = exprCombineStrength({
    _: "BinaryOperator",
    binaryOperatorExpr: binaryOperatorExpr,
  });
  const leftExprCombineStrength = exprCombineStrength(binaryOperatorExpr.left);
  const rightExprCombineStrength = exprCombineStrength(
    binaryOperatorExpr.right,
  );
  const associativity = binaryOperatorAssociativity(
    binaryOperatorExpr.operator,
  );

  return (
    (operatorExprCombineStrength > leftExprCombineStrength ||
        (operatorExprCombineStrength === leftExprCombineStrength &&
          associativity === "RightToLeft")
      ? "(" +
        exprToString(binaryOperatorExpr.left, indent, context) +
        ")"
      : exprToString(binaryOperatorExpr.left, indent, context)) +
    " " +
    binaryOperatorToString(binaryOperatorExpr.operator) +
    " " +
    (operatorExprCombineStrength > rightExprCombineStrength ||
        (operatorExprCombineStrength === rightExprCombineStrength &&
          associativity === "LeftToRight")
      ? "(" +
        exprToString(binaryOperatorExpr.right, indent, context) +
        ")"
      : exprToString(binaryOperatorExpr.right, indent, context))
  );
};

const conditionalOperatorToString = (
  conditionalOperator: d.ConditionalOperatorExpr,
  indent: number,
  context: Context,
): string => {
  const expr: d.TsExpr = {
    _: "ConditionalOperator",
    conditionalOperatorExpr: conditionalOperator,
  };
  return (
    exprToStringWithCombineStrength(
      expr,
      conditionalOperator.condition,
      indent,
      context,
    ) +
    "?" +
    exprToStringWithCombineStrength(
      expr,
      conditionalOperator.thenExpr,
      indent,
      context,
    ) +
    ":" +
    exprToStringWithCombineStrength(
      expr,
      conditionalOperator.elseExpr,
      indent,
      context,
    )
  );
};

/**
 * ラムダ式の本体 文が1つでreturn exprだった場合、returnを省略する形にする
 * @param statementList
 * @param indent
 */
export const lambdaBodyToString = (
  statementList: ReadonlyArray<d.Statement>,
  indent: number,
  context: Context,
): string => {
  const [firstStatement] = statementList;
  if (firstStatement !== undefined && firstStatement._ === "Return") {
    return exprToStringWithCombineStrength(
      {
        _: "Lambda",
        lambdaExpr: {
          typeParameterList: [],
          parameterList: [],
          returnType: { _: "Void" },
          statementList: [],
        },
      },
      firstStatement.tsExpr,
      indent,
      context,
    );
  }
  return statementListToString(statementList, indent, context);
};

const callExprToString = (
  expr: d.TsExpr,
  callExpr: d.CallExpr,
  indent: number,
  context: Context,
) =>
  exprToStringWithCombineStrength(
    expr,
    callExpr.expr,
    indent,
    context,
  ) +
  "(" +
  callExpr.parameterList
    .map((parameter) => exprToString(parameter, indent, context))
    .join(", ") +
  ")";

/**
 * ```ts
 * list[0] // [0]
 * data.name // .name
 * ```
 * の部分indexのExprがstringLiteralで識別子に使える文字なら`.name`のようになる
 */
const indexAccessToString = (
  indexExpr: d.TsExpr,
  indent: number,
  context: Context,
): string => {
  if (indexExpr._ === "StringLiteral" && isSafePropertyName(indexExpr.string)) {
    return "." + indexExpr.string;
  }
  return "[" + exprToString(indexExpr, indent, context) + "]";
};

type Associativity = "LeftToRight" | "RightToLeft";

const binaryOperatorAssociativity = (
  binaryOperator: d.BinaryOperator,
): Associativity => {
  switch (binaryOperator) {
    case "Exponentiation":
      return "RightToLeft";
    case "Multiplication":
    case "Division":
    case "Remainder":
    case "Addition":
    case "Subtraction":
    case "LeftShift":
    case "SignedRightShift":
    case "UnsignedRightShift":
    case "LessThan":
    case "LessThanOrEqual":
    case "Equal":
    case "NotEqual":
    case "BitwiseAnd":
    case "BitwiseXOr":
    case "BitwiseOr":
    case "LogicalAnd":
    case "LogicalOr":
    case "??":
      return "LeftToRight";
  }
};

export const binaryOperatorToString = (
  binaryOperator: d.BinaryOperator,
): string => {
  switch (binaryOperator) {
    case "Exponentiation":
      return "**";
    case "Multiplication":
      return "*";
    case "Division":
      return "/";
    case "Remainder":
      return "%";
    case "Addition":
      return "+";
    case "Subtraction":
      return "-";
    case "LeftShift":
      return "<<";
    case "SignedRightShift":
      return ">>";
    case "UnsignedRightShift":
      return ">>>";
    case "LessThan":
      return "<";
    case "LessThanOrEqual":
      return "<=";
    case "Equal":
      return "===";
    case "NotEqual":
      return "!==";
    case "BitwiseAnd":
      return "&";
    case "BitwiseXOr":
      return "^";
    case "BitwiseOr":
      return "|";
    case "LogicalAnd":
      return "&&";
    case "LogicalOr":
      return "||";
    case "??":
      return "??";
  }
};
