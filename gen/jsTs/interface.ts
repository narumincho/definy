import * as identifer from "./identifer";
import { Statement, TsExpr, TsType } from "../../data";

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
export const get = (expr: TsExpr, propertyName: string): TsExpr =>
  TsExpr.Get({
    expr,
    propertyExpr: TsExpr.StringLiteral(propertyName),
  });

/**
 * メソッドを呼ぶ (getとcallのシンタックスシュガー)
 * @param expr
 * @param methodName
 * @param parameterList
 */
export const callMethod = (
  expr: TsExpr,
  methodName: string,
  parameterList: ReadonlyArray<TsExpr>
): TsExpr => TsExpr.Call({ expr: get(expr, methodName), parameterList });

/**
 * 単項マイナス演算子 `-a`
 * @param expr 式
 */
export const minus = (expr: TsExpr): TsExpr =>
  TsExpr.UnaryOperator({
    operator: "Minus",
    expr,
  });

/**
 * ビット否定 `~a`
 * @param expr 式
 */
export const bitwiseNot = (expr: TsExpr): TsExpr =>
  TsExpr.UnaryOperator({
    operator: "BitwiseNot",
    expr,
  });

/**
 * 論理否定 `!a`
 * @param left 左辺
 * @param right 右辺
 */
export const logicalNot = (expr: TsExpr): TsExpr =>
  TsExpr.UnaryOperator({
    operator: "LogicalNot",
    expr,
  });

/**
 * べき乗 `a ** b`
 * @param left
 * @param right
 */
export const exponentiation = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "Multiplication",
    left,
    right,
  });

/**
 * 数値の掛け算 `a * b`
 * @param left 左辺
 * @param right 右辺
 */
export const multiplication = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "Multiplication",
    left,
    right,
  });

/**
 * 数値の割り算 `a / b`
 * @param left 左辺
 * @param right 右辺
 */
export const division = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "Division",
    left,
    right,
  });

/**
 * 剰余演算 `a % b`
 * @param left 左辺
 * @param right 右辺
 */
export const modulo = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "Remainder",
    left,
    right,
  });

/**
 * 数値の足し算、文字列の結合 `a + b`
 * @param left 左辺
 * @param right 右辺
 */
export const addition = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "Addition",
    left,
    right,
  });

/**
 * 数値の引き算 `a - b`
 * @param left 左辺
 * @param right 右辺
 */
export const subtraction = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "Subtraction",
    left,
    right,
  });

/**
 * 左シフト `a << b`
 * @param left 左辺
 * @param right 右辺
 */
export const leftShift = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "LeftShift",
    left,
    right,
  });

/**
 * 符号を維持する右シフト `a >> b`
 * @param left 左辺
 * @param right 右辺
 */
export const signedRightShift = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "SignedRightShift",
    left,
    right,
  });

/**
 * 符号を維持しない(0埋め)右シフト `a >>> b`
 * @param left 左辺
 * @param right 右辺
 */
export const unsignedRightShift = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "UnsignedRightShift",
    left,
    right,
  });

/**
 * 未満 `a < b`
 * @param left 左辺
 * @param right 右辺
 */
export const lessThan = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "LessThan",
    left,
    right,
  });

/**
 * 以下 `a <= b`
 * @param left 左辺
 * @param right 右辺
 */
export const lessThanOrEqual = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "LessThanOrEqual",
    left,
    right,
  });
/**
 * 等号 `a === b`
 * @param left 左辺
 * @param right 右辺
 */
export const equal = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "Equal",
    left,
    right,
  });

/**
 * 不等号 `a !== b`
 * @param left 左辺
 * @param right 右辺
 */
export const notEqual = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "NotEqual",
    left,
    right,
  });

/**
 * ビットAND `a & b`
 * @param left 左辺
 * @param right 右辺
 */
export const bitwiseAnd = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "BitwiseAnd",
    left,
    right,
  });

export const bitwiseXOr = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "BitwiseXOr",
    left,
    right,
  });

/**
 * ビットOR `a | b`
 * @param left 左辺
 * @param right 右辺
 */
export const bitwiseOr = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "BitwiseOr",
    left,
    right,
  });

/**
 * 論理AND `a && b`
 * @param left 左辺
 * @param right 右辺
 */
export const logicalAnd = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
    operator: "LogicalAnd",
    left,
    right,
  });

/**
 * 論理OR `a || b`
 * @param left 左辺
 * @param right 右辺
 */
export const logicalOr = (left: TsExpr, right: TsExpr): TsExpr =>
  TsExpr.BinaryOperator({
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
  parameterList: ReadonlyArray<TsExpr>
): TsExpr =>
  callMethod(
    TsExpr.GlobalObjects(identifer.identiferFromString("Number")),
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
  parameterList: ReadonlyArray<TsExpr>
): TsExpr =>
  callMethod(
    TsExpr.GlobalObjects(identifer.identiferFromString("Math")),
    methodName,
    parameterList
  );

/**
 * ```ts
 * new Date()
 * ```
 */
export const newDate: TsExpr = TsExpr.New({
  expr: TsExpr.GlobalObjects(identifer.identiferFromString("Date")),
  parameterList: [],
});

/**
 * ```ts
 * new Uint8Array(lengthOrIterable)
 * ```
 */
export const newUint8Array = (lengthOrIterable: TsExpr): TsExpr =>
  TsExpr.New({
    expr: TsExpr.GlobalObjects(identifer.identiferFromString("Uint8Array")),
    parameterList: [lengthOrIterable],
  });

/**
 * ```ts
 * new Map(initKeyValueList)
 * ```
 */
export const newMap = (initKeyValueList: TsExpr): TsExpr =>
  TsExpr.New({
    expr: TsExpr.GlobalObjects(identifer.identiferFromString("Map")),
    parameterList: [initKeyValueList],
  });

/**
 * ```ts
 * new Set(initValueList)
 * ```
 */
export const newSet = (initValueList: TsExpr): TsExpr =>
  TsExpr.New({
    expr: TsExpr.GlobalObjects(identifer.identiferFromString("Set")),
    parameterList: [initValueList],
  });

/**
 * ```ts
 * console.log(expr)
 * ```
 */
export const consoleLog = (expr: TsExpr): Statement =>
  Statement.EvaluateExpr(
    callMethod(
      TsExpr.GlobalObjects(identifer.identiferFromString("console")),
      "log",
      [expr]
    )
  );

/**
 * `Array<elementType>`
 */
export const arrayType = (elementType: TsType): TsType =>
  TsType.WithTypeParameter({
    type: TsType.ScopeInGlobal(identifer.identiferFromString("Array")),
    typeParameterList: [elementType],
  });

/**
 * `ReadonlyArray<elementType>`
 */
export const readonlyArrayType = (elementType: TsType): TsType =>
  TsType.WithTypeParameter({
    type: TsType.ScopeInGlobal(identifer.identiferFromString("ReadonlyArray")),
    typeParameterList: [elementType],
  });

/**
 * `Uint8Array`
 */
export const uint8ArrayType: TsType = TsType.ScopeInGlobal(
  identifer.identiferFromString("Uint8Array")
);

/**
 * `Promise<returnType>`
 */
export const promiseType = (returnType: TsType): TsType =>
  TsType.WithTypeParameter({
    type: TsType.ScopeInGlobal(identifer.identiferFromString("Promise")),
    typeParameterList: [returnType],
  });

/**
 * `Date`
 */
export const dateType: TsType = TsType.ScopeInGlobal(
  identifer.identiferFromString("Date")
);

/**
 * `Map<keyType, valueType>`
 */
export const mapType = (keyType: TsType, valueType: TsType): TsType =>
  TsType.WithTypeParameter({
    type: TsType.ScopeInGlobal(identifer.identiferFromString("Map")),
    typeParameterList: [keyType, valueType],
  });

/**
 * `ReadonlyMap<keyType, valueType>`
 */
export const readonlyMapType = (keyType: TsType, valueType: TsType): TsType =>
  TsType.WithTypeParameter({
    type: TsType.ScopeInGlobal(identifer.identiferFromString("ReadonlyMap")),
    typeParameterList: [keyType, valueType],
  });

/**
 * `Set<elementType>`
 */
export const setType = (elementType: TsType): TsType =>
  TsType.WithTypeParameter({
    type: TsType.ScopeInGlobal(identifer.identiferFromString("Set")),
    typeParameterList: [elementType],
  });

/**
 * `ReadonlySet<elementType>`
 */
export const readonlySetType = (elementType: TsType): TsType =>
  TsType.WithTypeParameter({
    type: TsType.ScopeInGlobal(identifer.identiferFromString("ReadonlySet")),
    typeParameterList: [elementType],
  });
