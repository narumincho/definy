import * as d from "./data.ts";
import * as identifier from "./identifier.ts";

/**
 * 使われている名前, モジュールのパス
 * モジュールの識別子を作るのに使う
 */
export type UsedNameAndModulePathSet = {
  readonly usedNameSet: ReadonlySet<identifier.TsIdentifier>;
  readonly modulePathSet: ReadonlySet<string>;
};

/**
 * プロパティの値を取得する。getByExprのシンタックスシュガー
 * @param expr 式
 * @param propertyName プロパティ名
 */
export const get = (expr: d.TsExpr, propertyName: string): d.TsExpr => ({
  _: "Get",
  getExpr: { expr, propertyExpr: { _: "StringLiteral", string: propertyName } },
});

/**
 * メソッドを呼ぶ (getとcallのシンタックスシュガー)
 * @param expr
 * @param methodName
 * @param parameterList
 */
export const callMethod = (
  expr: d.TsExpr,
  methodName: string,
  parameterList: ReadonlyArray<d.TsExpr>,
): d.TsExpr => ({
  _: "Call",
  callExpr: { expr: get(expr, methodName), parameterList },
});

/**
 * `then` メソッドを呼ぶ
 */
export const callThenMethod = (
  expr: d.TsExpr,
  thenLambda: d.LambdaExpr,
): d.TsExpr => ({
  _: "Call",
  callExpr: {
    expr: get(expr, "then"),
    parameterList: [{ _: "Lambda", lambdaExpr: thenLambda }],
  },
});

/**
 * `catch` メソッドを呼ぶ
 */
export const callCatchMethod = (
  expr: d.TsExpr,
  thenLambda: d.LambdaExpr,
): d.TsExpr => ({
  _: "Call",
  callExpr: {
    expr: get(expr, "catch"),
    parameterList: [{ _: "Lambda", lambdaExpr: thenLambda }],
  },
});

/**
 * 単項マイナス演算子 `-a`
 * @param expr 式
 */
export const minus = (expr: d.TsExpr): d.TsExpr => ({
  _: "UnaryOperator",
  unaryOperatorExpr: {
    operator: "Minus",
    expr,
  },
});

/**
 * ビット否定 `~a`
 * @param expr 式
 */
export const bitwiseNot = (expr: d.TsExpr): d.TsExpr => ({
  _: "UnaryOperator",
  unaryOperatorExpr: {
    operator: "BitwiseNot",
    expr,
  },
});

/**
 * 論理否定 `!a`
 * @param expr 式
 */
export const logicalNot = (expr: d.TsExpr): d.TsExpr => ({
  _: "UnaryOperator",
  unaryOperatorExpr: {
    operator: "LogicalNot",
    expr,
  },
});

/**
 * typeof 演算子 `typeof a`
 * @param expr 式
 */
export const typeofExpr = (expr: d.TsExpr): d.TsExpr => ({
  _: "UnaryOperator",
  unaryOperatorExpr: {
    operator: "typeof",
    expr,
  },
});

/**
 * べき乗 `a ** b`
 * @param left
 * @param right
 */
export const exponentiation = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "Multiplication",
    left,
    right,
  },
});

/**
 * 数値の掛け算 `a * b`
 * @param left 左辺
 * @param right 右辺
 */
export const multiplication = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: { operator: "Multiplication", left, right },
});

/**
 * 数値の割り算 `a / b`
 * @param left 左辺
 * @param right 右辺
 */
export const division = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: { operator: "Division", left, right },
});

/**
 * 剰余演算 `a % b`
 * @param left 左辺
 * @param right 右辺
 */
export const modulo = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: { operator: "Remainder", left, right },
});

/**
 * 数値の足し算、文字列の結合 `a + b`
 * @param left 左辺
 * @param right 右辺
 */
export const addition = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: { operator: "Addition", left, right },
});

/**
 * 数値の引き算 `a - b`
 * @param left 左辺
 * @param right 右辺
 */
export const subtraction = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "Subtraction",
    left,
    right,
  },
});

/**
 * 左シフト `a << b`
 * @param left 左辺
 * @param right 右辺
 */
export const leftShift = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "LeftShift",
    left,
    right,
  },
});

/**
 * 符号を維持する右シフト `a >> b`
 * @param left 左辺
 * @param right 右辺
 */
export const signedRightShift = (
  left: d.TsExpr,
  right: d.TsExpr,
): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "SignedRightShift",
    left,
    right,
  },
});

/**
 * 符号を維持しない(0埋め)右シフト `a >>> b`
 * @param left 左辺
 * @param right 右辺
 */
export const unsignedRightShift = (
  left: d.TsExpr,
  right: d.TsExpr,
): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "UnsignedRightShift",
    left,
    right,
  },
});

/**
 * 未満 `a < b`
 * @param left 左辺
 * @param right 右辺
 */
export const lessThan = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "LessThan",
    left,
    right,
  },
});

/**
 * 以下 `a <= b`
 * @param left 左辺
 * @param right 右辺
 */
export const lessThanOrEqual = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "LessThanOrEqual",
    left,
    right,
  },
});

/**
 * 等号 `a === b`
 * @param left 左辺
 * @param right 右辺
 */
export const equal = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "Equal",
    left,
    right,
  },
});

/**
 * 不等号 `a !== b`
 * @param left 左辺
 * @param right 右辺
 */
export const notEqual = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "NotEqual",
    left,
    right,
  },
});

/**
 * ビットAND `a & b`
 * @param left 左辺
 * @param right 右辺
 */
export const bitwiseAnd = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "BitwiseAnd",
    left,
    right,
  },
});

export const bitwiseXOr = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "BitwiseXOr",
    left,
    right,
  },
});

/**
 * ビットOR `a | b`
 * @param left 左辺
 * @param right 右辺
 */
export const bitwiseOr = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "BitwiseOr",
    left,
    right,
  },
});

/**
 * 論理AND `a && b`
 * @param left 左辺
 * @param right 右辺
 */
export const logicalAnd = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "LogicalAnd",
    left,
    right,
  },
});

/**
 * 論理OR `a || b`
 * @param left 左辺
 * @param right 右辺
 */
export const logicalOr = (left: d.TsExpr, right: d.TsExpr): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "LogicalOr",
    left,
    right,
  },
});

/**
 * ```ts
 * a ?? b
 * ```
 */
export const nullishCoalescing = (
  left: d.TsExpr,
  right: d.TsExpr,
): d.TsExpr => ({
  _: "BinaryOperator",
  binaryOperatorExpr: {
    operator: "??",
    left,
    right,
  },
});

/**
 * ```ts
 * Number.parseInt(parameter)
 * Number.isNaN(parameter)
 * ```
 */
export const callNumberMethod = (
  methodName: string,
  parameterList: ReadonlyArray<d.TsExpr>,
): d.TsExpr =>
  callMethod(
    {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("Number"),
    },
    methodName,
    parameterList,
  );

/**
 * ```ts
 * Math.floor(parameter)
 * Math.sqrt(parameter)
 * ```
 */
export const callMathMethod = (
  methodName: string,
  parameterList: ReadonlyArray<d.TsExpr>,
): d.TsExpr =>
  callMethod(
    {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("Math"),
    },
    methodName,
    parameterList,
  );

/**
 * ```ts
 * new Date()
 * ```
 */
export const newDate: d.TsExpr = {
  _: "New",
  callExpr: {
    expr: {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("Date"),
    },
    parameterList: [],
  },
};

/**
 * ```ts
 * new Uint8Array(lengthOrIterable)
 * ```
 */
export const newUint8Array = (lengthOrIterable: d.TsExpr): d.TsExpr => ({
  _: "New",
  callExpr: {
    expr: {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("Uint8Array"),
    },
    parameterList: [lengthOrIterable],
  },
});

/**
 * ```ts
 * new URL(expr)
 * ```
 */
export const newURL = (expr: d.TsExpr): d.TsExpr => ({
  _: "New",
  callExpr: {
    expr: {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("URL"),
    },
    parameterList: [expr],
  },
});

/**
 * ```ts
 * fetch(expr)
 * ```
 */
export const callFetch = (
  input: d.TsExpr,
  init?: d.TsExpr | undefined,
): d.TsExpr => ({
  _: "Call",
  callExpr: {
    expr: {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("fetch"),
    },
    parameterList: [input, ...(init === undefined ? [] : [init])],
  },
});

/**
 * ```ts
 * new Map(initKeyValueList)
 * ```
 */
export const newMap = (initKeyValueList: d.TsExpr): d.TsExpr => ({
  _: "New",
  callExpr: {
    expr: {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("Map"),
    },
    parameterList: [initKeyValueList],
  },
});

/**
 * ```ts
 * new Set(initValueList)
 * ```
 */
export const newSet = (initValueList: d.TsExpr): d.TsExpr => ({
  _: "New",
  callExpr: {
    expr: {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("Set"),
    },
    parameterList: [initValueList],
  },
});

/**
 * ```ts
 * console.log(expr)
 * ```
 */
export const consoleLog = (expr: d.TsExpr): d.Statement => ({
  _: "EvaluateExpr",
  tsExpr: callMethod(
    {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("console"),
    },
    "log",
    [expr],
  ),
});
/**
 * `Array<elementType>`
 */
export const arrayType = (elementType: d.TsType): d.TsType => ({
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("Array"),
    arguments: [elementType],
  },
});

/**
 * `ReadonlyArray<elementType>`
 */
export const readonlyArrayType = (elementType: d.TsType): d.TsType => ({
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("ReadonlyArray"),
    arguments: [elementType],
  },
});

/**
 * `Uint8Array`
 */
export const uint8ArrayType: d.TsType = {
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("Uint8Array"),
    arguments: [],
  },
};

/**
 * `URL`
 */
export const urlType: d.TsType = {
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("URL"),
    arguments: [],
  },
};

/**
 * `Response`
 */
export const responseType: d.TsType = {
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("Response"),
    arguments: [],
  },
};

/**
 * `Promise<returnType>`
 */
export const promiseType = (returnType: d.TsType): d.TsType => ({
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("Promise"),
    arguments: [returnType],
  },
});

/**
 * `Date`
 */
export const dateType: d.TsType = {
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("Date"),
    arguments: [],
  },
};

/**
 * `Map<keyType, valueType>`
 */
export const mapType = (keyType: d.TsType, valueType: d.TsType): d.TsType => ({
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("Map"),
    arguments: [keyType, valueType],
  },
});

/**
 * `ReadonlyMap<keyType, valueType>`
 */
export const readonlyMapType = (
  keyType: d.TsType,
  valueType: d.TsType,
): d.TsType => ({
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("ReadonlyMap"),
    arguments: [keyType, valueType],
  },
});

/**
 * `Set<elementType>`
 */
export const setType = (elementType: d.TsType): d.TsType => ({
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("Set"),
    arguments: [elementType],
  },
});

/**
 * `ReadonlySet<elementType>`
 */
export const readonlySetType = (elementType: d.TsType): d.TsType => ({
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: {
    name: identifier.identifierFromString("ReadonlySet"),
    arguments: [elementType],
  },
});

export const objectLiteral = (
  memberList: ReadonlyArray<d.TsMember>,
): d.TsExpr => ({
  _: "ObjectLiteral",
  tsMemberList: memberList,
});

/**
 * ```ts
 * array.map(parameter)
 * ```
 */
export const arrayMap = (array: d.TsExpr, parameter: d.TsExpr): d.TsExpr => {
  return callMethod(array, "map", [parameter]);
};

export const variable = (name: identifier.TsIdentifier): d.TsExpr => ({
  _: "Variable",
  tsIdentifier: name,
});

export const memberKeyValue = (key: string, value: d.TsExpr): d.TsMember => ({
  _: "KeyValue",
  keyValue: {
    key: stringLiteral(key),
    value,
  },
});

export const typeScopeInFileNoArguments = (
  name: identifier.TsIdentifier,
): d.TsType => ({
  _: "ScopeInFile",
  typeNameAndTypeParameter: {
    name,
    arguments: [],
  },
});

export const statementReturn = (expr: d.TsExpr): d.Statement => ({
  _: "Return",
  tsExpr: expr,
});

export const statementEvaluateExpr = (expr: d.TsExpr): d.Statement => ({
  _: "EvaluateExpr",
  tsExpr: expr,
});

export const newTextDecoder: d.TsExpr = {
  _: "New",
  callExpr: {
    expr: {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("TextDecoder"),
    },
    parameterList: [],
  },
};

export const newTextEncoder: d.TsExpr = {
  _: "New",
  callExpr: {
    expr: {
      _: "GlobalObjects",
      tsIdentifier: identifier.identifierFromString("TextEncoder"),
    },
    parameterList: [],
  },
};

export const numberLiteral = (number: number): d.TsExpr => ({
  _: "NumberLiteral",
  int32: number,
});

export const stringLiteral = (string: string): d.TsExpr => ({
  _: "StringLiteral",
  string,
});

export const exportDefinitionFunction = (
  func: d.Function,
): d.ExportDefinition => ({ type: "function", function: func });

export const typeUnion = (tsTypeList: ReadonlyArray<d.TsType>): d.TsType => ({
  _: "Union",
  tsTypeList,
});

export const typeObject = (
  tsMemberTypeList: ReadonlyArray<d.TsMemberType>,
): d.TsType => ({
  _: "Object",
  tsMemberTypeList,
});

export const call = (callExpr: d.CallExpr): d.TsExpr => ({
  _: "Call",
  callExpr,
});

export const statementIf = (ifStatement: d.IfStatement): d.Statement => ({
  _: "If",
  ifStatement,
});

export const statementVariableDefinition = (
  variableDefinitionStatement: d.VariableDefinitionStatement,
): d.Statement => ({
  _: "VariableDefinition",
  variableDefinitionStatement,
});

export const statementFor = (forStatement: d.ForStatement): d.Statement => ({
  _: "For",
  forStatement,
});

export const statementForOf = (
  forOfStatement: d.ForOfStatement,
): d.Statement => ({
  _: "ForOf",
  forOfStatement,
});

export const arrayLiteral = (
  arrayItemList: ReadonlyArray<d.ArrayItem>,
): d.TsExpr => ({
  _: "ArrayLiteral",
  arrayItemList,
});

export const typeAssertion = (param: d.TypeAssertion): d.TsExpr => ({
  _: "TypeAssertion",
  typeAssertion: param,
});

export const statementSet = (setStatement: d.SetStatement): d.Statement => ({
  _: "Set",
  setStatement,
});

/**
 * ラムダ式の型を抽出する
 */
export const lambdaToType = (lambda: d.LambdaExpr): d.TsType => {
  return {
    _: "Function",
    functionType: {
      parameterList: lambda.parameterList.map((parameter) => parameter.type),
      return: lambda.returnType,
      typeParameterList: lambda.typeParameterList,
    },
  };
};

export const symbolToStringTag: d.TsExpr = get({
  _: "GlobalObjects",
  tsIdentifier: identifier.identifierFromString("Symbol"),
}, "toStringTag");
