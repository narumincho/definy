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

/**
 * 式をコードに変換する
 * @param expr 式
 */
// eslint-disable-next-line complexity
export const exprToString = (
  expr: d.TsExpr,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
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
        moduleMap,
        codeType
      );

    case "ObjectLiteral":
      return objectLiteralToString(
        expr.tsMemberList,
        indent,
        moduleMap,
        codeType
      );

    case "UnaryOperator":
      return (
        unaryOperatorToString(expr.unaryOperatorExpr.operator) +
        exprToStringWithCombineStrength(
          expr,
          expr.unaryOperatorExpr.expr,
          indent,
          moduleMap,
          codeType
        )
      );
    case "BinaryOperator":
      return binaryOperatorExprToString(
        expr.binaryOperatorExpr,
        indent,
        moduleMap,
        codeType
      );

    case "ConditionalOperator":
      return conditionalOperatorToString(
        expr.conditionalOperatorExpr,
        indent,
        moduleMap,
        codeType
      );

    case "Lambda":
      return (
        typeParameterListToString(expr.lambdaExpr.typeParameterList) +
        "(" +
        expr.lambdaExpr.parameterList
          .map(
            (parameter) =>
              parameter.name +
              typeAnnotation(parameter.type, codeType, moduleMap)
          )
          .join(", ") +
        ")" +
        typeAnnotation(expr.lambdaExpr.returnType, codeType, moduleMap) +
        " => " +
        lambdaBodyToString(
          expr.lambdaExpr.statementList,
          indent,
          moduleMap,
          codeType
        )
      );

    case "Variable":
      return expr.tsIdentifier;

    case "GlobalObjects":
      return "globalThis." + expr.tsIdentifier;

    case "ImportedVariable": {
      const nameSpaceIdentifier = moduleMap.get(
        expr.importedVariable.moduleName
      );
      if (nameSpaceIdentifier === undefined) {
        throw Error(
          "収集されなかった, モジュールがある moduleName=" +
            expr.importedVariable.moduleName
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
          moduleMap,
          codeType
        ) +
        indexAccessToString(
          expr.getExpr.propertyExpr,
          indent,
          moduleMap,
          codeType
        )
      );

    case "Call":
      return callExprToString(expr, expr.callExpr, indent, moduleMap, codeType);

    case "New":
      return (
        "new " +
        callExprToString(expr, expr.callExpr, indent, moduleMap, codeType)
      );

    case "TypeAssertion":
      return (
        exprToString(expr.typeAssertion.expr, indent, moduleMap, codeType) +
        (codeType === "TypeScript"
          ? " as " + typeToString(expr.typeAssertion.type, moduleMap)
          : "")
      );
  }
};

const arrayLiteralToString = (
  itemList: ReadonlyArray<d.ArrayItem>,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
): string =>
  "[" +
  itemList
    .map(
      (item) =>
        (item.spread ? "..." : "") +
        exprToString(item.expr, indent, moduleMap, codeType)
    )
    .join(", ") +
  "]";

const objectLiteralToString = (
  memberList: ReadonlyArray<d.TsMember>,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
): string =>
  "{ " +
  memberList
    .map((member) => {
      switch (member._) {
        case "Spread":
          return (
            "..." + exprToString(member.tsExpr, indent, moduleMap, codeType)
          );
        case "KeyValue":
          if (
            isIdentifier(member.keyValue.key) &&
            member.keyValue.value._ === "Variable" &&
            member.keyValue.key === member.keyValue.value.tsIdentifier
          ) {
            return member.keyValue.key;
          }
          return (
            (isSafePropertyName(member.keyValue.key)
              ? member.keyValue.key
              : stringLiteralValueToString(member.keyValue.key)) +
            ": " +
            exprToString(member.keyValue.value, indent, moduleMap, codeType)
          );
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
  }
};

const exprToStringWithCombineStrength = (
  expr: d.TsExpr,
  target: d.TsExpr,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
): string => {
  const text = exprToString(target, indent, moduleMap, codeType);
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
  binaryOperator: d.BinaryOperator
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
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
): string => {
  const operatorExprCombineStrength = exprCombineStrength({
    _: "BinaryOperator",
    binaryOperatorExpr: binaryOperatorExpr,
  });
  const leftExprCombineStrength = exprCombineStrength(binaryOperatorExpr.left);
  const rightExprCombineStrength = exprCombineStrength(
    binaryOperatorExpr.right
  );
  const associativity = binaryOperatorAssociativity(
    binaryOperatorExpr.operator
  );

  return (
    (operatorExprCombineStrength > leftExprCombineStrength ||
    (operatorExprCombineStrength === leftExprCombineStrength &&
      associativity === "RightToLeft")
      ? "(" +
        exprToString(binaryOperatorExpr.left, indent, moduleMap, codeType) +
        ")"
      : exprToString(binaryOperatorExpr.left, indent, moduleMap, codeType)) +
    " " +
    binaryOperatorToString(binaryOperatorExpr.operator) +
    " " +
    (operatorExprCombineStrength > rightExprCombineStrength ||
    (operatorExprCombineStrength === rightExprCombineStrength &&
      associativity === "LeftToRight")
      ? "(" +
        exprToString(binaryOperatorExpr.right, indent, moduleMap, codeType) +
        ")"
      : exprToString(binaryOperatorExpr.right, indent, moduleMap, codeType))
  );
};

const conditionalOperatorToString = (
  conditionalOperator: d.ConditionalOperatorExpr,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
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
      moduleMap,
      codeType
    ) +
    "?" +
    exprToStringWithCombineStrength(
      expr,
      conditionalOperator.thenExpr,
      indent,
      moduleMap,
      codeType
    ) +
    ":" +
    exprToStringWithCombineStrength(
      expr,
      conditionalOperator.elseExpr,
      indent,
      moduleMap,
      codeType
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
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
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
      moduleMap,
      codeType
    );
  }
  return statementListToString(statementList, indent, moduleMap, codeType);
};

const callExprToString = (
  expr: d.TsExpr,
  callExpr: d.CallExpr,
  indent: number,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
) =>
  exprToStringWithCombineStrength(
    expr,
    callExpr.expr,
    indent,
    moduleMap,
    codeType
  ) +
  "(" +
  callExpr.parameterList
    .map((parameter) => exprToString(parameter, indent, moduleMap, codeType))
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
  moduleMap: ReadonlyMap<string, TsIdentifier>,
  codeType: d.CodeType
): string => {
  if (indexExpr._ === "StringLiteral" && isSafePropertyName(indexExpr.string)) {
    return "." + indexExpr.string;
  }
  return "[" + exprToString(indexExpr, indent, moduleMap, codeType) + "]";
};

type Associativity = "LeftToRight" | "RightToLeft";

const binaryOperatorAssociativity = (
  binaryOperator: d.BinaryOperator
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
  binaryOperator: d.BinaryOperator
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
