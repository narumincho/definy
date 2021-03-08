import * as identifer from "js-ts-code-generator/identifer";
import * as ts from "js-ts-code-generator/data";
import * as tsUtil from "js-ts-code-generator/util";
import * as util from "../util";

export const codecTypeWithTypeParameter = (
  type_: ts.Type,
  typeParameterList: ReadonlyArray<string>
): ts.Type => {
  return typeParameterList.length === 0
    ? codecType(type_)
    : ts.Type.Function({
        typeParameterList: typeParameterList.map(identifer.fromString),
        parameterList: typeParameterList.map((typeParameter) =>
          codecType(ts.Type.ScopeInFile(identifer.fromString(typeParameter)))
        ),
        return: codecType(
          ts.Type.WithTypeParameter({
            type: type_,
            typeParameterList: typeParameterList.map((typeParameter) =>
              ts.Type.ScopeInFile(identifer.fromString(typeParameter))
            ),
          })
        ),
      });
};

const codecName = identifer.fromString("Codec");

/**
 * ```ts
 * Codec<type_>
 * ```
 * を表す
 */
export const codecType = (type_: ts.Type): ts.Type =>
  ts.Type.WithTypeParameter({
    type: ts.Type.ScopeInFile(codecName),
    typeParameterList: [type_],
  });

export const codecTypeAlias = (): ts.TypeAlias => {
  const typeParameterIdentifer = identifer.fromString("T");
  return {
    name: codecName,
    document: "バイナリと相互変換するための関数",
    typeParameterList: [typeParameterIdentifer],
    type: ts.Type.Object([
      {
        name: util.encodePropertyName,
        required: true,
        type: encodeFunctionType(ts.Type.ScopeInFile(typeParameterIdentifer)),
        document: "",
      },
      {
        name: util.decodePropertyName,
        required: true,
        type: decodeFunctionType(ts.Type.ScopeInFile(typeParameterIdentifer)),
        document: "",
      },
    ]),
  };
};

export const variableDefinition = (
  name: ts.Identifer,
  type_: ts.Type,
  document: string,
  codecDocument: string,
  encodeDefinition: ts.Expr,
  decodeDefinition: ts.Expr
): ts.Variable => ({
  name,
  document,
  type: ts.Type.Object([
    {
      name: util.codecPropertyName,
      required: true,
      type: codecType(type_),
      document: codecDocument,
    },
  ]),
  expr: ts.Expr.ObjectLiteral([
    ts.Member.KeyValue({
      key: util.codecPropertyName,
      value: ts.Expr.ObjectLiteral([
        ts.Member.KeyValue({
          key: util.encodePropertyName,
          value: encodeDefinition,
        }),
        ts.Member.KeyValue({
          key: util.decodePropertyName,
          value: decodeDefinition,
        }),
      ]),
    }),
  ]),
});

/**
 * ```ts
 * (a: type_) => Readonly<number>
 * ```
 */
export const encodeFunctionType = (type_: ts.Type): ts.Type =>
  ts.Type.Function({
    typeParameterList: [],
    parameterList: [type_],
    return: encodeReturnType,
  });

export const encodeLambda = (
  type_: ts.Type,
  statementList: (valueExpr: ts.Expr) => ReadonlyArray<ts.Statement>
): ts.Expr => {
  const valueName = identifer.fromString("value");
  return ts.Expr.Lambda({
    typeParameterList: [],
    parameterList: [
      {
        name: valueName,
        type: type_,
      },
    ],
    returnType: encodeReturnType,
    statementList: statementList(ts.Expr.Variable(valueName)),
  });
};

export const encodeReturnType = tsUtil.readonlyArrayType(ts.Type.Number);
/**
 * ```ts
 * (a: number, b: Uint8Array) => { readonly result: type_, readonly nextIndex: number }
 * ```
 */
export const decodeFunctionType = (type_: ts.Type): ts.Type =>
  ts.Type.Function({
    typeParameterList: [],
    parameterList: decodeParameterList.map((parameter) => parameter.type),
    return: decodeReturnType(type_),
  });

export const decodeReturnType = (type_: ts.Type): ts.Type =>
  ts.Type.Object([
    {
      name: util.resultProperty,
      required: true,
      type: type_,
      document: "",
    },
    {
      name: util.nextIndexProperty,
      required: true,
      type: ts.Type.Number,
      document: "",
    },
  ]);

export const indexIdentifer = identifer.fromString("index");
export const binaryIdentifer = identifer.fromString("binary");

/**
 * ( index: number, binary: Uint8Array )
 */
export const decodeParameterList: ReadonlyArray<ts.ParameterWithDocument> = [
  {
    name: indexIdentifer,
    type: ts.Type.Number,
    document: "バイナリを読み込み開始位置",
  },
  {
    name: binaryIdentifer,
    type: tsUtil.uint8ArrayType,
    document: "バイナリ",
  },
];

/**
 * ```ts
 * return { result: resultExpr, nextIndex: nextIndexExpr }
 * ```
 * を表現するコード
 */
export const returnStatement = (
  resultExpr: ts.Expr,
  nextIndexExpr: ts.Expr
): ts.Statement =>
  ts.Statement.Return(
    ts.Expr.ObjectLiteral([
      ts.Member.KeyValue({ key: util.resultProperty, value: resultExpr }),
      ts.Member.KeyValue({ key: util.nextIndexProperty, value: nextIndexExpr }),
    ])
  );

export const decodeLambda = (
  type: ts.Type,
  statementList: (
    parameterIndex: ts.Expr,
    parameterBinary: ts.Expr
  ) => ReadonlyArray<ts.Statement>
): ts.Expr => {
  return ts.Expr.Lambda({
    typeParameterList: [],
    parameterList: decodeParameterList,
    returnType: decodeReturnType(type),
    statementList: statementList(
      ts.Expr.Variable(indexIdentifer),
      ts.Expr.Variable(binaryIdentifer)
    ),
  });
};

/**
 * ```ts
 * expr.result
 * ```
 */
export const getResult = (resultAndNextIndexExpr: ts.Expr): ts.Expr =>
  tsUtil.get(resultAndNextIndexExpr, util.resultProperty);

/**
 * ```ts
 * expr.nextIndex
 * ```
 */
export const getNextIndex = (resultAndNextIndexExpr: ts.Expr): ts.Expr =>
  tsUtil.get(resultAndNextIndexExpr, util.nextIndexProperty);

/**
 * 名前の末尾に `Codec` をつける
 */
export const codecParameterName = (name: string): ts.Identifer =>
  identifer.fromString(name + "Codec");
