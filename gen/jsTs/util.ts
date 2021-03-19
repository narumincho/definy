import * as identifer from "./identifer";
import { Expr, Statement, Type } from "./data";

/**
 * 使われている名前, モジュールのパス
 * モジュールの識別子を作るのに使う
 */
export type UsedNameAndModulePathSet = {
  readonly usedNameSet: ReadonlySet<string>;
  readonly modulePathSet: ReadonlySet<string>;
};

/**
 * プロパティの値を取得する。getByExprのシンタックスシュガー
 * @param expr 式
 * @param propertyName プロパティ名
 */
export const get = (expr: Expr, propertyName: string): Expr =>
  Expr.Get({
    expr,
    propertyExpr: Expr.StringLiteral(propertyName),
  });

/**
 * メソッドを呼ぶ (getとcallのシンタックスシュガー)
 * @param expr
 * @param methodName
 * @param parameterList
 */
export const callMethod = (
  expr: Expr,
  methodName: string,
  parameterList: ReadonlyArray<Expr>
): Expr => Expr.Call({ expr: get(expr, methodName), parameterList });

/**
 * 単項マイナス演算子 `-a`
 * @param expr 式
 */
export const minus = (expr: Expr): Expr =>
  Expr.UnaryOperator({
    operator: "Minus",
    expr,
  });

/**
 * ビット否定 `~a`
 * @param expr 式
 */
export const bitwiseNot = (expr: Expr): Expr =>
  Expr.UnaryOperator({
    operator: "BitwiseNot",
    expr,
  });

/**
 * 論理否定 `!a`
 * @param left 左辺
 * @param right 右辺
 */
export const logicalNot = (expr: Expr): Expr =>
  Expr.UnaryOperator({
    operator: "LogicalNot",
    expr,
  });

/**
 * べき乗 `a ** b`
 * @param left
 * @param right
 */
export const exponentiation = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "Multiplication",
    left,
    right,
  });

/**
 * 数値の掛け算 `a * b`
 * @param left 左辺
 * @param right 右辺
 */
export const multiplication = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "Multiplication",
    left,
    right,
  });

/**
 * 数値の割り算 `a / b`
 * @param left 左辺
 * @param right 右辺
 */
export const division = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "Division",
    left,
    right,
  });

/**
 * 剰余演算 `a % b`
 * @param left 左辺
 * @param right 右辺
 */
export const modulo = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "Remainder",
    left,
    right,
  });

/**
 * 数値の足し算、文字列の結合 `a + b`
 * @param left 左辺
 * @param right 右辺
 */
export const addition = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "Addition",
    left,
    right,
  });

/**
 * 数値の引き算 `a - b`
 * @param left 左辺
 * @param right 右辺
 */
export const subtraction = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "Subtraction",
    left,
    right,
  });

/**
 * 左シフト `a << b`
 * @param left 左辺
 * @param right 右辺
 */
export const leftShift = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "LeftShift",
    left,
    right,
  });

/**
 * 符号を維持する右シフト `a >> b`
 * @param left 左辺
 * @param right 右辺
 */
export const signedRightShift = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "SignedRightShift",
    left,
    right,
  });

/**
 * 符号を維持しない(0埋め)右シフト `a >>> b`
 * @param left 左辺
 * @param right 右辺
 */
export const unsignedRightShift = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "UnsignedRightShift",
    left,
    right,
  });

/**
 * 未満 `a < b`
 * @param left 左辺
 * @param right 右辺
 */
export const lessThan = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "LessThan",
    left,
    right,
  });

/**
 * 以下 `a <= b`
 * @param left 左辺
 * @param right 右辺
 */
export const lessThanOrEqual = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "LessThanOrEqual",
    left,
    right,
  });
/**
 * 等号 `a === b`
 * @param left 左辺
 * @param right 右辺
 */
export const equal = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "Equal",
    left,
    right,
  });

/**
 * 不等号 `a !== b`
 * @param left 左辺
 * @param right 右辺
 */
export const notEqual = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "NotEqual",
    left,
    right,
  });

/**
 * ビットAND `a & b`
 * @param left 左辺
 * @param right 右辺
 */
export const bitwiseAnd = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "BitwiseAnd",
    left,
    right,
  });

export const bitwiseXOr = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "BitwiseXOr",
    left,
    right,
  });

/**
 * ビットOR `a | b`
 * @param left 左辺
 * @param right 右辺
 */
export const bitwiseOr = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "BitwiseOr",
    left,
    right,
  });

/**
 * 論理AND `a && b`
 * @param left 左辺
 * @param right 右辺
 */
export const logicalAnd = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "LogicalAnd",
    left,
    right,
  });

/**
 * 論理OR `a || b`
 * @param left 左辺
 * @param right 右辺
 */
export const logicalOr = (left: Expr, right: Expr): Expr =>
  Expr.BinaryOperator({
    operator: "LogicalOr",
    left,
    right,
  });

/**
 * ```ts
 * Number.parseInt(parameter)
 * Number.isNaN(parameter)
 * ```
 */
export const callNumberMethod = (
  methodName: string,
  parameterList: ReadonlyArray<Expr>
): Expr =>
  callMethod(
    Expr.GlobalObjects(identifer.fromString("Number")),
    methodName,
    parameterList
  );

/**
 * ```ts
 * Math.floor(parameter)
 * Math.sqrt(parameter)
 * ```
 */
export const callMathMethod = (
  methodName: string,
  parameterList: ReadonlyArray<Expr>
): Expr =>
  callMethod(
    Expr.GlobalObjects(identifer.fromString("Math")),
    methodName,
    parameterList
  );

/**
 * ```ts
 * new Date()
 * ```
 */
export const newDate: Expr = Expr.New({
  expr: Expr.GlobalObjects(identifer.fromString("Date")),
  parameterList: [],
});

/**
 * ```ts
 * new Uint8Array(lengthOrIterable)
 * ```
 */
export const newUint8Array = (lengthOrIterable: Expr): Expr =>
  Expr.New({
    expr: Expr.GlobalObjects(identifer.fromString("Uint8Array")),
    parameterList: [lengthOrIterable],
  });

/**
 * ```ts
 * new Map(initKeyValueList)
 * ```
 */
export const newMap = (initKeyValueList: Expr): Expr =>
  Expr.New({
    expr: Expr.GlobalObjects(identifer.fromString("Map")),
    parameterList: [initKeyValueList],
  });

/**
 * ```ts
 * new Set(initValueList)
 * ```
 */
export const newSet = (initValueList: Expr): Expr =>
  Expr.New({
    expr: Expr.GlobalObjects(identifer.fromString("Set")),
    parameterList: [initValueList],
  });

/**
 * ```ts
 * console.log(expr)
 * ```
 */
export const consoleLog = (expr: Expr): Statement =>
  Statement.EvaluateExpr(
    callMethod(Expr.GlobalObjects(identifer.fromString("console")), "log", [
      expr,
    ])
  );

/**
 * `Array<elementType>`
 */
export const arrayType = (elementType: Type): Type =>
  Type.WithTypeParameter({
    type: Type.ScopeInGlobal(identifer.fromString("Array")),
    typeParameterList: [elementType],
  });

/**
 * `ReadonlyArray<elementType>`
 */
export const readonlyArrayType = (elementType: Type): Type =>
  Type.WithTypeParameter({
    type: Type.ScopeInGlobal(identifer.fromString("ReadonlyArray")),
    typeParameterList: [elementType],
  });

/**
 * `Uint8Array`
 */
export const uint8ArrayType: Type = Type.ScopeInGlobal(
  identifer.fromString("Uint8Array")
);

/**
 * `Promise<returnType>`
 */
export const promiseType = (returnType: Type): Type =>
  Type.WithTypeParameter({
    type: Type.ScopeInGlobal(identifer.fromString("Promise")),
    typeParameterList: [returnType],
  });

/**
 * `Date`
 */
export const dateType: Type = Type.ScopeInGlobal(identifer.fromString("Date"));

/**
 * `Map<keyType, valueType>`
 */
export const mapType = (keyType: Type, valueType: Type): Type =>
  Type.WithTypeParameter({
    type: Type.ScopeInGlobal(identifer.fromString("Map")),
    typeParameterList: [keyType, valueType],
  });

/**
 * `ReadonlyMap<keyType, valueType>`
 */
export const readonlyMapType = (keyType: Type, valueType: Type): Type =>
  Type.WithTypeParameter({
    type: Type.ScopeInGlobal(identifer.fromString("ReadonlyMap")),
    typeParameterList: [keyType, valueType],
  });

/**
 * `Set<elementType>`
 */
export const setType = (elementType: Type): Type =>
  Type.WithTypeParameter({
    type: Type.ScopeInGlobal(identifer.fromString("Set")),
    typeParameterList: [elementType],
  });

/**
 * `ReadonlySet<elementType>`
 */
export const readonlySetType = (elementType: Type): Type =>
  Type.WithTypeParameter({
    type: Type.ScopeInGlobal(identifer.fromString("ReadonlySet")),
    typeParameterList: [elementType],
  });
