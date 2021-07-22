import * as ts from "../../localData";
import * as util from "../util";
import { jsTs } from "../../gen/main";

export const codecTypeWithTypeParameter = (
  type_: ts.TsType,
  typeParameterList: ReadonlyArray<string>
): ts.TsType => {
  return typeParameterList.length === 0
    ? codecType(type_)
    : ts.TsType.Function({
        typeParameterList: typeParameterList.map(jsTs.identiferFromString),
        parameterList: typeParameterList.map((typeParameter) =>
          codecType(
            ts.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter))
          )
        ),
        return: codecType(
          ts.TsType.WithTypeParameter({
            type: type_,
            typeParameterList: typeParameterList.map((typeParameter) =>
              ts.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter))
            ),
          })
        ),
      });
};

const codecName = jsTs.identiferFromString("Codec");

/**
 * ```ts
 * Codec<type_>
 * ```
 * を表す
 */
export const codecType = (type_: ts.TsType): ts.TsType =>
  ts.TsType.WithTypeParameter({
    type: ts.TsType.ScopeInFile(codecName),
    typeParameterList: [type_],
  });

export const codecTypeAlias = (): ts.TypeAlias => {
  const typeParameterIdentifer = jsTs.identiferFromString("T");
  return {
    name: codecName,
    document: "バイナリと相互変換するための関数",
    typeParameterList: [typeParameterIdentifer],
    type: ts.TsType.Object([
      {
        name: util.encodePropertyName,
        required: true,
        type: encodeFunctionType(ts.TsType.ScopeInFile(typeParameterIdentifer)),
        document: "",
      },
      {
        name: util.decodePropertyName,
        required: true,
        type: decodeFunctionType(ts.TsType.ScopeInFile(typeParameterIdentifer)),
        document: "",
      },
    ]),
  };
};

export const variableDefinition = (
  name: ts.TsIdentifer,
  type_: ts.TsType,
  document: string,
  codecDocument: string,
  encodeDefinition: ts.TsExpr,
  decodeDefinition: ts.TsExpr
): ts.Variable => ({
  name,
  document,
  type: ts.TsType.Object([
    {
      name: util.codecPropertyName,
      required: true,
      type: codecType(type_),
      document: codecDocument,
    },
  ]),
  expr: ts.TsExpr.ObjectLiteral([
    ts.TsMember.KeyValue({
      key: util.codecPropertyName,
      value: ts.TsExpr.ObjectLiteral([
        ts.TsMember.KeyValue({
          key: util.encodePropertyName,
          value: encodeDefinition,
        }),
        ts.TsMember.KeyValue({
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
export const encodeFunctionType = (type_: ts.TsType): ts.TsType =>
  ts.TsType.Function({
    typeParameterList: [],
    parameterList: [type_],
    return: encodeReturnType,
  });

export const encodeLambda = (
  type_: ts.TsType,
  statementList: (valueExpr: ts.TsExpr) => ReadonlyArray<ts.Statement>
): ts.TsExpr => {
  const valueName = jsTs.identiferFromString("value");
  return ts.TsExpr.Lambda({
    typeParameterList: [],
    parameterList: [
      {
        name: valueName,
        type: type_,
      },
    ],
    returnType: encodeReturnType,
    statementList: statementList(ts.TsExpr.Variable(valueName)),
  });
};

export const encodeReturnType = jsTs.readonlyArrayType(ts.TsType.Number);
/**
 * ```ts
 * (a: number, b: Uint8Array) => { readonly result: type_, readonly nextIndex: number }
 * ```
 */
export const decodeFunctionType = (type_: ts.TsType): ts.TsType =>
  ts.TsType.Function({
    typeParameterList: [],
    parameterList: decodeParameterList.map((parameter) => parameter.type),
    return: decodeReturnType(type_),
  });

export const decodeReturnType = (type_: ts.TsType): ts.TsType =>
  ts.TsType.Object([
    {
      name: util.resultProperty,
      required: true,
      type: type_,
      document: "",
    },
    {
      name: util.nextIndexProperty,
      required: true,
      type: ts.TsType.Number,
      document: "",
    },
  ]);

export const indexIdentifer = jsTs.identiferFromString("index");
export const binaryIdentifer = jsTs.identiferFromString("binary");

/**
 * ( index: number, binary: Uint8Array )
 */
export const decodeParameterList: ReadonlyArray<ts.ParameterWithDocument> = [
  {
    name: indexIdentifer,
    type: ts.TsType.Number,
    document: "バイナリを読み込み開始位置",
  },
  {
    name: binaryIdentifer,
    type: jsTs.uint8ArrayType,
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
  resultExpr: ts.TsExpr,
  nextIndexExpr: ts.TsExpr
): ts.Statement =>
  ts.Statement.Return(
    ts.TsExpr.ObjectLiteral([
      ts.TsMember.KeyValue({ key: util.resultProperty, value: resultExpr }),
      ts.TsMember.KeyValue({
        key: util.nextIndexProperty,
        value: nextIndexExpr,
      }),
    ])
  );

export const decodeLambda = (
  type: ts.TsType,
  statementList: (
    parameterIndex: ts.TsExpr,
    parameterBinary: ts.TsExpr
  ) => ReadonlyArray<ts.Statement>
): ts.TsExpr => {
  return ts.TsExpr.Lambda({
    typeParameterList: [],
    parameterList: decodeParameterList,
    returnType: decodeReturnType(type),
    statementList: statementList(
      ts.TsExpr.Variable(indexIdentifer),
      ts.TsExpr.Variable(binaryIdentifer)
    ),
  });
};

/**
 * ```ts
 * expr.result
 * ```
 */
export const getResult = (resultAndNextIndexExpr: ts.TsExpr): ts.TsExpr =>
  jsTs.get(resultAndNextIndexExpr, util.resultProperty);

/**
 * ```ts
 * expr.nextIndex
 * ```
 */
export const getNextIndex = (resultAndNextIndexExpr: ts.TsExpr): ts.TsExpr =>
  jsTs.get(resultAndNextIndexExpr, util.nextIndexProperty);

/**
 * 名前の末尾に `Codec` をつける
 */
export const codecParameterName = (name: string): ts.TsIdentifer =>
  jsTs.identiferFromString(name + "Codec");
